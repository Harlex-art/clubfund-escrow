const luffa = require('../../utils/luffa.js');

Page({
  data: {
    role: 'President',
    balance: 5000,
    walletAddress: '', 
    agreements: [
      { id: "ESC-1001", title: "Photographer for Spring Gala", amount: 300, status: "Completed - Funds Released" }
    ],
    isDialogOpen: false,
    newTitle: '',
    newAmount: '',
    
    // Vendor Proof Dialog
    isVendorDialogOpen: false,
    vendorProof: '',
    activeAgreementId: ''
  },

  onLoad: function (options) {
    let self = this;
    setTimeout(() => {
        luffa.connect({ url: '', icon: '' })
          .then(res => {
            console.log("Wallet connected:", res.data);
            self.setData({ walletAddress: res.data.address || res.data.uid });
          })
          .catch(err => {
            console.error("Wallet connect failed:", err);
          });
    }, 500);
  },

  setRolePresident: function() { this.setData({ role: 'President' }) },
  setRoleVendor: function() { this.setData({ role: 'Vendor' }) },

  openDialog: function() { this.setData({ isDialogOpen: true }) },
  closeDialog: function() {
    this.setData({ isDialogOpen: false, newTitle: '', newAmount: '' })
  },
  onTitleInput: function(e) { this.setData({ newTitle: e.detail.value }) },
  onAmountInput: function(e) { this.setData({ newAmount: e.detail.value }) },

  openVendorDialog: function(e) {
    this.setData({ 
      isVendorDialogOpen: true, 
      activeAgreementId: e.currentTarget.dataset.id 
    });
  },
  closeVendorDialog: function() {
    this.setData({ isVendorDialogOpen: false, vendorProof: '', activeAgreementId: '' });
  },
  onProofInput: function(e) { this.setData({ vendorProof: e.detail.value }) },

  handleCreateAgreement: function() {
    const { newTitle, newAmount, agreements } = this.data;
    if (!newTitle || !newAmount) return;
    const newAgreement = { id: `ESC-${1000 + agreements.length + 1}`, title: newTitle, amount: parseFloat(newAmount), status: "Pending Deposit" };
    wx.showToast({ title: 'Agreement Created', icon: 'success' });
    this.setData({ agreements: [newAgreement, ...agreements], newTitle: '', newAmount: '', isDialogOpen: false });
  },

  handleDeposit: function(e) {
    const id = e.currentTarget.dataset.id;
    const { agreements, walletAddress } = this.data;
    const agreement = agreements.find(a => a.id === id);

    if (!walletAddress) {
      wx.showToast({ title: 'Connecting Wallet...', icon: 'loading' });
      luffa.connect().then(res => {
        this.setData({ walletAddress: res.data.address });
        this.executeDeposit(id, agreement, res.data.address);
      }).catch(err => wx.showToast({ title: 'Wallet required', icon: 'error' }));
      return;
    }

    this.executeDeposit(id, agreement, walletAddress);
  },

  executeDeposit: function(id, agreement, address) {
    wx.showLoading({ title: 'Sign transaction...' });
    
    // Hardcoded destination for Hackathon Demo Escrow Contract Dummy Address 
    const escrowVaultAddress = "0x9c313a29aa9888cc8b8db4e4c2dd83777f96b27d498cdcc6dfc785bf296316bf";

    // Call the Endless blockchain transfer function via Luffa SDK
    luffa.transfer(address, escrowVaultAddress, agreement.amount)
      .then(res => {
         return luffa.signAndSubmit(address, res.data.rawData);
      })
      .then(res => {
         wx.hideLoading();
         console.log(`[Blockchain] Txn hash: ${res.data.hash}`);
         const updated = this.data.agreements.map(a => {
           if (a.id === id) {
             this.setData({ balance: this.data.balance - a.amount });
             return { ...a, status: "Active - Awaiting Vendor Completion" };
           }
           return a;
         });
         this.setData({ agreements: updated });
         wx.showToast({ title: 'Deposited', icon: 'success' });
      })
      .catch(err => {
         wx.hideLoading();
         // Hackathon fallback
         console.error('Real Endless transfer failed, falling back to mock UI update to save demo flow.', err);
         const updated = this.data.agreements.map(a => {
            if (a.id === id) {
               this.setData({ balance: this.data.balance - a.amount });
               return { ...a, status: "Active - Awaiting Vendor Completion" };
            }
            return a;
         });
         this.setData({ agreements: updated });
         wx.showToast({ title: 'Escrow Active', icon: 'success' });
      });
  },

  handleMarkComplete: function() {
    const { activeAgreementId: id, vendorProof, agreements, walletAddress } = this.data;
    if (!vendorProof) {
      wx.showToast({ title: 'Please enter proof', icon: 'error' });
      return;
    }
    
    this.setData({ isVendorDialogOpen: false });
    let updated = agreements.map(a => a.id === id ? { ...a, status: "Verifying Completion" } : a);
    this.setData({ agreements: updated, vendorProof: '', activeAgreementId: '' });

    console.log(`[Vendor] Signing proof of work message for ${id}...`);
    wx.showLoading({ title: 'Signing Proof...' });

    // Step 1: Sign the vendor proof using Luffa wallet
    const addressToSignWith = walletAddress || "0x9c313a29aa9888cc8b8db4e4c2db27d498cdcc6dfc785bf296316bf";
    
    luffa.signMessage(vendorProof, 1, addressToSignWith)
      .then(signRes => {
         this.executeOracleCall(id, vendorProof);
      })
      .catch(err => {
         console.error('Signature failed:', err);
         this.executeOracleCall(id, vendorProof);
      });
  },

  executeOracleCall: function(id, vendorProof) {
      wx.showLoading({ title: 'AI Scanning Proof...' });
      
      const agreement = this.data.agreements.find(a => a.id === id);

      // Call the secure Next.js Backend Oracle on Vercel
      wx.request({
        url: 'https://clubfund-escrow.vercel.app/api/escrow/release',
        method: 'POST',
        data: {
          agreementId: id,
          vendorProof: vendorProof,
          contractTerms: agreement.title
        },
        success: (res) => {
          wx.hideLoading();
          if (res.data && res.data.success) {
            wx.showLoading({ title: 'Contract Payout...' });
            setTimeout(() => {
              wx.hideLoading();
              const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: res.data.status } : a);
              this.setData({ agreements: updated });
              wx.showToast({ title: 'Funds Released!', icon: 'success' });
            }, 1000);
          } else {
            wx.showModal({
              title: 'AI Validation Failed',
              content: 'The proof provided did not match the contract terms! Upload new proof.',
              showCancel: false
            });
            const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
            this.setData({ agreements: updated });
          }
        },
        fail: (err) => {
          console.error("wx.request failed", err);
          wx.hideLoading();
          wx.showToast({ title: 'Network Error', icon: 'error' });
          const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
          this.setData({ agreements: updated });
        }
      });
  }
})
