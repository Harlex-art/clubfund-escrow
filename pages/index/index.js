const luffa = require('../../utils/luffa.js');

// ─── Treasurer Whitelist ──────────────────────────────────────────────────────
// Add the wallet address(es) of the Treasurer(s) here.
// When the app loads on a real device, the role will be set automatically
// based on the connected wallet. The manual toggle remains for the IDE simulator.
const PRESIDENT_ADDRESSES = [
  'Cpx1em8x6u4zDNh9kga9rzwhJfucufVCqeUEYjZneQNX'
];
// ─────────────────────────────────────────────────────────────────────────────

Page({
  data: {
    role: 'Treasurer',
    balance: 0,
    balanceDisplay: 'Fetching...',
    walletAddress: '',
    agreements: [],
    isDialogOpen: false,
    newTitle: '',
    newAmount: '',
    newVendorAddress: '',
    newTermsList: ['', '', '', '', '', ''],
    activeTermsCount: 1,
    newLocation: '',
    newEventType: '',

    vendorLoggedIn: false,
    vendorLoginAddress: '',

    isVendorDialogOpen: false,
    isEditingProof: false,
    activeAgreementTerms: '',
    vendorProof: '',
    vendorProofText: '',
    vendorProofUrl: '',
    activeAgreementId: '',
    isAgreementCompleted: false,

    windowHeight: 600,
    keyboardHeight: 0
  },

  onLoad: function (options) {
    let self = this;
    // Get window height once so we can compute keyboard-aware dialog sizing
    try {
      const sys = wx.getSystemInfoSync();
      const wh = sys.windowHeight || 600;
      this.platform = sys.platform || 'devtools';
      self.setData({ windowHeight: wh });
    } catch (e) { }
    setTimeout(() => {
      luffa.connect({ url: '', icon: '' })
        .then(res => {
          const address = res.data.address || res.data.uid;
          if (!address) {
            self.setData({ walletAddress: '', balanceDisplay: 'Connect Wallet' });
            return;
          }
          console.log("Wallet connected:", address);
          const isTreasurer = PRESIDENT_ADDRESSES.includes(address);
          console.log(`[Role] Detected: ${isTreasurer ? 'Treasurer' : 'Vendor'}`);
          self.setData({ walletAddress: address, role: isTreasurer ? 'Treasurer' : 'Vendor' });
          self.fetchBalance(address);
        })
        .catch(err => {
          console.error("Wallet connect failed:", err);
          // DevTools simulator does not support invokeNativePlugin.
          // Show constant demo values so the UI is ready for presentation.
          const demoAddress = 'Cpx1em8x6u4zDNh9kga9rzwhJfucufVCqeUEYjZneQNX';
          self.setData({
            walletAddress: demoAddress,
            role: 'Treasurer',
            balance: 500.00,
            balanceDisplay: '500.00 EDS'
          });
          console.log('[Demo] Wallet and Balance simulated for IDE');
        });
    }, 500);

    setInterval(() => {
      let changed = false;
      const now = Date.now();
      const updated = this.data.agreements.map(a => {
        if (a.status === "Active - Awaiting Treasurer Approval" && a.releaseDate) {
          const diff = a.releaseDate - now;
          let newText = "";
          if (diff > 0) {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            newText = `⏳ Auto-releases in ${h}h ${m}m ${s}s`;
          } else {
            newText = `⏳ Releasing automatically...`;
          }
          if (a.countdownText !== newText) {
            changed = true;
            return { ...a, countdownText: newText };
          }
        }
        return a;
      });
      if (changed) {
        this.setData({ agreements: updated });
      }
    }, 1000);
  },

  fetchBalance: function (address) {
    // For Demo: Only set initial balance if it's still at 0
    if (this.data.balance === 0) {
      const initialBalance = 500.00;
      const isDev = this.platform === 'devtools';
      this.setData({
        balance: initialBalance,
        balanceDisplay: `${initialBalance.toFixed(2)} EDS${isDev ? ' (Demo)' : ''}`
      });
      console.log('[Demo] Initial treasury balance set to 500.00');
    }
  },

  onKeyboardHeightChange: function (e) {
    const kh = e.detail.height || 0;
    this.setData({ keyboardHeight: kh });
  },

  setRoleTreasurer: function () { this.setData({ role: 'Treasurer' }) },
  setRoleVendor: function () { this.setData({ role: 'Vendor' }) },

  openDialog: function () { this.setData({ isDialogOpen: true }) },
  closeDialog: function () {
    this.setData({ isDialogOpen: false, newTitle: '', newAmount: '', newVendorAddress: '', newTermsList: ['', '', '', '', '', ''], activeTermsCount: 1, newLocation: '', newEventType: '' })
  },
  onTitleInput: function (e) { this.setData({ newTitle: e.detail.value }) },
  onAmountInput: function (e) {
    // Strip anything that isn't a digit or a single decimal point
    let raw = e.detail.value.replace(/[^0-9.]/g, '');
    // Allow only one decimal point
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) raw = parts[0] + '.' + parts[1].slice(0, 2);
    this.setData({ newAmount: raw });
  },
  onVendorAddressInput: function (e) { this.setData({ newVendorAddress: e.detail.value }) },
  onLocationInput: function (e) { this.setData({ newLocation: e.detail.value }) },
  onEventTypeInput: function (e) { this.setData({ newEventType: e.detail.value }) },
  onTermsItemInput: function (e) {
    const idx = e.currentTarget.dataset.index;
    const list = [...this.data.newTermsList];
    list[idx] = e.detail.value;
    this.setData({ newTermsList: list });
  },
  addTerm: function () {
    const count = this.data.activeTermsCount;
    if (count < 6) this.setData({ activeTermsCount: count + 1 });
  },
  removeTerm: function (e) {
    const idx = e.currentTarget.dataset.index;
    const count = this.data.activeTermsCount;
    if (count > 1) {
      const list = [...this.data.newTermsList];
      list.splice(idx, 1);
      list.push(''); // keep array length at 6
      this.setData({ activeTermsCount: count - 1, newTermsList: list });
    }
  },
  onVendorLoginInput: function (e) { this.setData({ vendorLoginAddress: e.detail.value }) },

  handleVendorLogin: function () {
    const address = this.data.vendorLoginAddress.trim();
    if (!address) {
      wx.showToast({ title: 'Enter Wallet ID', icon: 'none' });
      return;
    }
    const hasJobs = this.data.agreements.some(a => a.vendorAddress === address);
    if (!hasJobs) {
      wx.showToast({ title: 'No jobs found for this address', icon: 'none' });
      return;
    }
    this.setData({
      vendorLoggedIn: true,
      walletAddress: address,
      role: 'Vendor'
    });
    wx.showToast({ title: 'Logged In', icon: 'success' });
  },

  openVendorDialog: function (e) {
    const id = e.currentTarget.dataset.id;
    const agreement = this.data.agreements.find(a => a.id === id);
    // If proof already exists on this agreement, pre-fill the dialog for editing
    const isEditing = !!(agreement && agreement.vendorProofText);
    this.setData({
      isVendorDialogOpen: true,
      isEditingProof: isEditing,
      isAgreementCompleted: agreement ? (agreement.status === 'Completed - Funds Released') : false,
      activeAgreementId: id,
      activeAgreementTerms: agreement ? agreement.terms : '',
      vendorProofText: agreement ? (agreement.vendorProofText || '') : '',
      vendorProofUrl: agreement ? (agreement.vendorProofUrl || '') : ''
    });
  },
  closeVendorDialog: function () {
    this.setData({ isVendorDialogOpen: false, isEditingProof: false, isAgreementCompleted: false, vendorProofText: '', vendorProofUrl: '', activeAgreementId: '' });
  },
  onProofTextInput: function (e) { this.setData({ vendorProofText: e.detail.value }) },
  onProofUrlInput: function (e) { this.setData({ vendorProofUrl: e.detail.value }) },

  handleCreateAgreement: function () {
    const { newTitle, newAmount, newVendorAddress, newTermsList, activeTermsCount, newLocation, newEventType, agreements } = this.data;
    const filledTerms = newTermsList.slice(0, activeTermsCount).filter(t => t.trim());

    // --- Field presence check with specific feedback ---
    if (!newTitle) { wx.showToast({ title: 'Enter Job Title', icon: 'none' }); return; }
    if (!newAmount) { wx.showToast({ title: 'Enter Amount', icon: 'none' }); return; }
    if (!newVendorAddress.trim()) { wx.showToast({ title: 'Enter Vendor Address', icon: 'none' }); return; }
    if (filledTerms.length === 0) { wx.showToast({ title: 'Add at least one requirement', icon: 'none' }); return; }

    console.log('[Create] Validation passed');

    // --- Amount validation ---
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: 'Enter a valid amount', icon: 'none' });
      return;
    }
    if (amount < 1) {
      wx.showToast({ title: 'Minimum is £1', icon: 'none' });
      return;
    }

    const doCreate = () => {
      const termsString = filledTerms.map((t, i) => `${i + 1}. ${t.trim()}`).join('\n');
      const newAgreement = {
        id: `ESC-${1000 + agreements.length + 1}`,
        title: newTitle,
        amount,
        vendorAddress: newVendorAddress.trim(),
        location: newLocation.trim(),
        eventType: newEventType.trim(),
        terms: termsString,
        status: "Pending Deposit",
        createdAtFormatted: new Date().toLocaleString()
      };
      wx.showToast({ title: 'Agreement Created', icon: 'success' });
      this.setData({ agreements: [newAgreement, ...agreements], newTitle: '', newAmount: '', newVendorAddress: '', newTermsList: ['', '', '', '', '', ''], activeTermsCount: 1, newLocation: '', newEventType: '', isDialogOpen: false });
    };

    // --- Large amount confirmation ---
    if (amount >= 1000) {
      wx.showModal({
        title: 'Large Amount',
        content: `You're creating an escrow for £${amount.toFixed(2)}. Please confirm this is correct.`,
        confirmText: 'Yes, Confirm',
        cancelText: 'Go Back',
        confirmColor: '#84B179',
        success: (res) => { if (res.confirm) doCreate(); }
      });
    } else {
      doCreate();
    }
  },

  handleDeposit: function (e) {
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

  executeDeposit: function (id, agreement, address) {
    wx.showLoading({ title: 'Awaiting Wallet Signature...' });
    const depositMessage = `Authorize ClubFund Escrow deposit of ${agreement.amount} EDS for: "${agreement.title}"`;

    const handleSuccess = (res) => {
      wx.hideLoading();
      console.log(`[Blockchain] Deposit authorized. Signature: ${res.data && res.data.signature}`);
      const updated = this.data.agreements.map(a => {
        if (a.id === id) {
          const newBalance = this.data.balance - a.amount;
          const isDev = this.platform === 'devtools';
          this.setData({
            balance: newBalance,
            balanceDisplay: `${newBalance.toFixed(2)} EDS${isDev ? ' (Demo)' : ''}`
          });
          return { ...a, status: "Active - Awaiting Vendor Acceptance" };
        }
        return a;
      });
      this.setData({ agreements: updated });
      wx.showToast({ title: 'Funds Locked in Escrow!', icon: 'success' });
    };

    if (this.platform === 'devtools') {
      // Mock success for simulator demo
      setTimeout(() => {
        handleSuccess({ data: { signature: 'MOCK_SIG_' + Date.now() } });
      }, 1500);
    } else {
      luffa.signMessage(depositMessage, Date.now(), address)
        .then(handleSuccess)
        .catch(err => {
          wx.hideLoading();
          console.error('Deposit signature rejected or cancelled:', err);
          wx.showToast({ title: 'Deposit Cancelled', icon: 'none' });
        });
    }
  },

  handleVendorAccept: function (e) {
    const id = e.currentTarget.dataset.id;
    const updated = this.data.agreements.map(a =>
      a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a
    );
    this.setData({ agreements: updated });
    wx.showToast({ title: 'Job Accepted!', icon: 'success' });
  },

  handleVendorDecline: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: 'Decline Job',
      content: 'Are you sure you want to decline this job? The Treasurer will be notified.',
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          const updated = this.data.agreements.map(a =>
            a.id === id ? { ...a, status: "Declined - Vendor Refused" } : a
          );
          this.setData({ agreements: updated });
          wx.showToast({ title: 'Job Declined', icon: 'none' });
        }
      }
    });
  },

  handleMarkComplete: function () {
    const { activeAgreementId: id, vendorProofText, vendorProofUrl, agreements, walletAddress, isEditingProof } = this.data;
    if (!vendorProofText.trim() && !vendorProofUrl.trim()) {
      wx.showToast({ title: 'Please enter proof', icon: 'error' });
      return;
    }

    const combinedProof = `Justification: ${vendorProofText}\nReceipt Link: ${vendorProofUrl}`;
    const priorAgreement = agreements.find(a => a.id === id);
    const rollbackStatus = isEditingProof ? "Active - Awaiting Treasurer Approval" : "Active - Awaiting Vendor Completion";

    this.setData({ isVendorDialogOpen: false, isEditingProof: false });
    let updated = agreements.map(a =>
      a.id === id ? { ...a, status: "Verifying Completion", vendorProofText, vendorProofUrl, aiAnalysis: '' } : a
    );
    this.setData({ agreements: updated, vendorProofText: '', vendorProofUrl: '', activeAgreementId: '' });

    console.log(`[Vendor] Signing proof of work message for ${id}...`);
    wx.showLoading({ title: 'Signing Proof...' });

    const addressToSignWith = walletAddress || "0x9c313a29aa9888cc8b8db4e4c2db27d498cdcc6dfc785bf296316bf";

    const handleSuccess = (signRes) => {
      this.executeOracleCall(id, combinedProof);
    };

    if (this.platform === 'devtools') {
      // Mock success for simulator
      setTimeout(() => handleSuccess({ data: { signature: 'MOCK_PROOF_SIG' } }), 1500);
    } else {
      luffa.signMessage(combinedProof, 1, addressToSignWith)
        .then(handleSuccess)
        .catch(err => {
          console.error('Signature failed or cancelled:', err);
          wx.hideLoading();
          wx.showToast({ title: 'Signature Cancelled', icon: 'none' });
          const rolledBack = this.data.agreements.map(a =>
            a.id === id ? { ...a, status: rollbackStatus, vendorProofText: priorAgreement.vendorProofText, vendorProofUrl: priorAgreement.vendorProofUrl } : a
          );
          this.setData({ agreements: rolledBack });
        });
    }
  },

  executeOracleCall: function (id, vendorProof) {
    wx.showLoading({ title: 'AI Scanning Proof...' });

    const agreement = this.data.agreements.find(a => a.id === id);

    // Moved OpenAI interaction directly into Luffa, bypassing Vercel perfectly
    wx.request({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer enter your OPEN AI API KEY Here'
      },
      data: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI Escrow Assistant. Review the Vendor's Proof against the Contract Terms. Provide a brief analysis (max 2 sentences) and a Confidence Score (0-100%) on whether the work was done."
          },
          {
            role: "user",
            content: `Contract Title: ${agreement.title}\nTerms: ${agreement.terms}\nVendor Proof:\n${vendorProof}`
          }
        ],
        temperature: 0.1
      },
      success: (res) => {
        wx.hideLoading();
        const data = res.data;
        let reply = "AI Analysis failed to parse.";

        if (res.statusCode !== 200) {
          reply = `OpenAI Error: ${data.error ? data.error.message : 'Invalid API Key or Quota'}`;
        } else if (data.choices && data.choices[0] && data.choices[0].message.content) {
          reply = data.choices[0].message.content;
        }

        wx.showToast({ title: 'AI Scan Finished', icon: 'none' });

        const releaseDate = Date.now() + 48 * 60 * 60 * 1000;

        const updated = this.data.agreements.map(a =>
          a.id === id ? { ...a, status: "Active - Awaiting Treasurer Approval", aiAnalysis: reply, releaseDate } : a
        );
        this.setData({ agreements: updated });
      },
      fail: (err) => {
        console.error("OpenAI request failed", err);
        wx.hideLoading();
        wx.showToast({ title: 'AI Network Error', icon: 'error' });
        const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Active - Awaiting Vendor Completion" } : a);
        this.setData({ agreements: updated });
      }
    });
  },

  handleApproveEscrow: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: 'Releasing Funds...' });

    // Artificial delay to simulate final Endless payment execution
    setTimeout(() => {
      wx.hideLoading();
      const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Completed - Funds Released" } : a);
      this.setData({ agreements: updated });
      wx.showToast({ title: 'Funds Released!', icon: 'success' });
    }, 1000);
  },

  handleDisputeEscrow: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: 'Dispute Escrow',
      content: 'Are you sure you want to dispute this proof? You must meeet the other party to reach a mutual settlement.',
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Disputed - Manual Review" } : a);
          this.setData({ agreements: updated });
          wx.showToast({ title: 'Escrow Disputed', icon: 'none' });
        }
      }
    });
  },

  handleRefundEscrow: function (e) {
    const id = e.currentTarget.dataset.id;
    const agreement = this.data.agreements.find(a => a.id === id);
    wx.showModal({
      title: 'Refund Escrow',
      content: `Are you sure you want to refund £${agreement.amount.toFixed(2)} back to the Treasury? This will cancel the agreement.`,
      confirmColor: '#dc2626',
      success: (res) => {
        if (res.confirm) {
          const newBalance = this.data.balance + agreement.amount;
          const isDev = this.platform === 'devtools';
          const updated = this.data.agreements.map(a => a.id === id ? { ...a, status: "Cancelled - Refunded to Club" } : a);

          this.setData({
            agreements: updated,
            balance: newBalance,
            balanceDisplay: `${newBalance.toFixed(2)} EDS${isDev ? ' (Demo)' : ''}`
          });
          wx.showToast({ title: 'Funds Refunded', icon: 'success' });
        }
      }
    });
  }
})
