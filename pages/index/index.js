const luffa = require('../../utils/luffa.js');

Page({
  data: {
    role: 'President',
    balance: 0,
    balanceDisplay: 'Fetching...',
    walletAddress: '', 
    agreements: [],
    isDialogOpen: false,
    newTitle: '',
    newAmount: '',
    
    isVendorDialogOpen: false,
    vendorProof: '',
    activeAgreementId: ''
  },

  onLoad: function (options) {
    let self = this;
    setTimeout(() => {
        luffa.connect({ url: '', icon: '' })
          .then(res => {
            const address = res.data.address || res.data.uid;
            if (!address) {
              self.setData({ walletAddress: '', balanceDisplay: 'Connect Wallet' });
              return;
            }
            console.log("Wallet connected:", address);
            self.setData({ walletAddress: address });
            self.fetchBalance(address);
          })
          .catch(err => {
            console.error("Wallet connect failed:", err);
            // DevTools simulator does not support invokeNativePlugin.
            // Show a simulated balance so the UI is previewable in the IDE.
            self.setData({ balanceDisplay: '10.00 EDS (Simulator)' });
          });
    }, 500);
  },

  fetchBalance: function(address) {
    wx.request({
      url: 'https://rpc-test.endless.link/v1/view',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        function: "0x1::primary_fungible_store::balance",
        type_arguments: ["0x1::endless_coin::EndlessCoin"],
        arguments: [address]
      },
      success: (res) => {
        console.log('[Balance] statusCode:', res.statusCode, 'data:', JSON.stringify(res.data));
        
        try {
          let raw = null;
          if (Array.isArray(res.data) && res.data.length > 0) raw = res.data[0];
          else if (res.data && res.data.result !== undefined) raw = res.data.result;
          else if (res.data && res.data.value !== undefined) raw = res.data.value;
          else if (typeof res.data === 'number' || (typeof res.data === 'string' && !isNaN(res.data))) raw = res.data;

          const parsed = parseInt(raw);
          if (!isNaN(parsed)) {
            const eds = (parsed / 100000000).toFixed(2);
            this.setData({ balance: parseFloat(eds), balanceDisplay: `${eds} EDS (Testnet)` });
          } else {
            // API returned but could not be parsed (testnet EDS type mismatch)
            // Safe fallback — shows testnet label without a broken value
            this.setData({ balanceDisplay: 'EDS Testnet' });
          }
        } catch(e) {
          console.error('[Balance] Parse exception:', e.message);
          this.setData({ balanceDisplay: 'EDS Testnet' });
        }
      },
      fail: (err) => {
        console.error('[Balance] Request failed:', JSON.stringify(err));
        this.setData({ balanceDisplay: 'EDS Testnet' });
      }
    });
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
    wx.showLoading({ title: 'Awaiting Wallet Signature...' });
    
    // We use signMessage here to trigger the real Luffa wallet popup.
    // This is because we don't have a deployed Endless smart contract yet.
    // In production, this would be replaced by luffa.transfer() + luffa.signAndSubmit().
    // The message the President signs is a human-readable escrow authorization.
    const depositMessage = `Authorize ClubFund Escrow deposit of ${agreement.amount} EDS for: "${agreement.title}"`;
    
    luffa.signMessage(depositMessage, Date.now(), address)
      .then(res => {
         wx.hideLoading();
         console.log(`[Blockchain] Deposit authorized. Signature: ${res.data && res.data.signature}`);
         const updated = this.data.agreements.map(a => {
           if (a.id === id) {
             this.setData({ balance: this.data.balance - a.amount });
             return { ...a, status: "Active - Awaiting Vendor Completion" };
           }
           return a;
         });
         this.setData({ agreements: updated });
         wx.showToast({ title: 'Funds Locked in Escrow!', icon: 'success' });
      })
      .catch(err => {
         // If the user explicitly hits "Cancel" on the wallet popup, abort cleanly.
         wx.hideLoading();
         console.error('Deposit signature rejected or cancelled:', err);
         wx.showToast({ title: 'Deposit Cancelled', icon: 'none' });
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

    const addressToSignWith = walletAddress || "0x9c313a29aa9888cc8b8db4e4c2db27d498cdcc6dfc785bf296316bf";
    
    luffa.signMessage(vendorProof, 1, addressToSignWith)
      .then(signRes => {
         this.executeOracleCall(id, vendorProof);
      })
      .catch(err => {
         // BUG FIX: Removed the duct-tape executeOracleCall payload here so an explicit
         // Signature cancellation safely cancels the transaction process.
         console.error('Signature failed or cancelled:', err);
         wx.hideLoading();
         wx.showToast({ title: 'Signature Cancelled', icon: 'none' });
         
         const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
         this.setData({ agreements: updated });
      });
  },

  executeOracleCall: function(id, vendorProof) {
      wx.showLoading({ title: 'AI Scanning Proof...' });
      
      const agreement = this.data.agreements.find(a => a.id === id);

      // Moved OpenAI interaction directly into Luffa, bypassing Vercel perfectly
      wx.request({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_OPENAI_API_KEY_HERE'
        },
        data: {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an impartial Escrow Oracle. Compare the Vendor's Proof against the Contract Terms. If the proof satisfies the terms, reply with ONLY the exact word TRUE. If it is entirely unrelated or insufficient, reply with ONLY the exact word FALSE."
            },
            {
              role: "user",
              content: `Contract Terms: ${agreement.title}\nVendor Proof: ${vendorProof}`
            }
          ],
          temperature: 0.1
        },
        success: (res) => {
          wx.hideLoading();
          const data = res.data;
          const reply = (data.choices && data.choices[0] && data.choices[0].message.content) 
                           ? data.choices[0].message.content.toUpperCase() : "";
          
          if (reply.includes("TRUE")) {
            wx.showLoading({ title: 'Contract Payout...' });
            
            // Artificial delay to simulate final Endless Oracle transfer for the Hackathon Demo
            setTimeout(() => {
              wx.hideLoading();
              const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Completed - Funds Released" } : a);
              this.setData({ agreements: updated });
              wx.showToast({ title: 'Funds Released!', icon: 'success' });
            }, 1000);
          } else {
            console.log("AI Rejected:", reply);
            wx.showModal({
              title: 'AI Validation Failed',
              content: 'The proof provided did not match the contract terms! Please upload new proof.',
              showCancel: false
            });
            const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
            this.setData({ agreements: updated });
          }
        },
        fail: (err) => {
          console.error("OpenAI request failed", err);
          wx.hideLoading();
          wx.showToast({ title: 'AI Network Error', icon: 'error' });
          const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
          this.setData({ agreements: updated });
        }
      });
  }
})
