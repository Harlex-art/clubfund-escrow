/**
 * Luffa SuperBox SDK Wrapper
 */

var NETWORK = 'endless'; 
var VERIFY_URL = 'https://k8s-ingressn-ingressn-f1c0412ab0-63d9d6d0cb58a38c.elb.ap-southeast-1.amazonaws.com/lf16585928939296/verify/endless/verify';

function create16String() {
  var len = 16;
  var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
  var result = '';
  for (var i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function connect(metadata) {
  return new Promise(function (resolve, reject) {
    var opts = {
      api_name: 'luffaWebRequest',
      data: {
        uuid: create16String(),
        methodName: 'connect',
        initData: { network: NETWORK },
        metadata: { superBox: true, url: (metadata && metadata.url) || '', icon: (metadata && metadata.icon) || '' },
        from: '',
        data: {}
      },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    };
    wx.invokeNativePlugin(opts);
  });
}

function signMessage(message, nonce, from) {
  return new Promise(function (resolve, reject) {
    var opts = {
      api_name: 'luffaWebRequest',
      data: {
        uuid: create16String(),
        methodName: 'signMessageV2',
        initData: { network: 'eds' },
        metadata: { superBox: true },
        from: from || '',
        data: { message: message, nonce: String(nonce || 1), address: false, application: false, chainId: false }
      },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    };
    wx.invokeNativePlugin(opts);
  });
}

function verifySignature(publicKey, signature, fullMessage) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: VERIFY_URL,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { key: publicKey, sign: signature, msg: fullMessage },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    });
  });
}

function packageTransaction(from, module, moduleName, functionName, data, argsData) {
  return new Promise(function (resolve, reject) {
    var opts = {
      api_name: 'luffaWebRequest',
      data: {
        uuid: create16String(),
        from: from,
        methodName: 'packageTransaction',
        initData: { network: NETWORK },
        data: { module: module, moduleName: moduleName, functionName: functionName, data: JSON.stringify(data), argsData: argsData || [] }
      },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    };
    wx.invokeNativePlugin(opts);
  });
}

function packageTransactionV2(from, func, functionArguments, typeArguments) {
  return new Promise(function (resolve, reject) {
    var opts = {
      api_name: 'luffaWebRequest',
      data: {
        uuid: create16String(),
        from: from,
        methodName: 'packageTransactionV2',
        initData: { network: NETWORK },
        data: { data: JSON.stringify({ payload: { function: func, functionArguments: functionArguments || [], typeArguments: typeArguments || [], typeEnum: [] }, secondarySignerAddresses: [], feePayer: '' }) }
      },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    };
    wx.invokeNativePlugin(opts);
  });
}

function signAndSubmit(from, rawData) {
  return new Promise(function (resolve, reject) {
    var opts = {
      api_name: 'luffaWebRequest',
      data: {
        uuid: create16String(),
        from: from,
        methodName: 'signAndSubmitTransaction',
        initData: { network: NETWORK },
        data: { serializedTransaction: { data: rawData } }
      },
      success: function (res) { resolve(res); },
      fail: function (err) { reject(err); }
    };
    wx.invokeNativePlugin(opts);
  });
}

function transfer(from, toAddress, amount) {
  return packageTransaction(from, '0x1', 'endless_account', 'transfer', {
    '1_address_address': toAddress,
    '2_u128_amount': String(Math.floor(amount * 100000000))
  }, []);
}

function getLanguage() {
  return new Promise(function (resolve, reject) {
    wx.invokeNativePlugin({ api_name: 'luffaWebRequest', data: { methodName: 'language' }, success: function (res) { resolve(res); }, fail: function (err) { reject(err); } });
  });
}

function share(title, detail, imageUrl, params) {
  var data = { title: title, detail: detail, imageUrl: imageUrl || '', methodName: 'share' };
  if (params) data.params = params;
  return new Promise(function (resolve, reject) {
    wx.invokeNativePlugin({ api_name: 'luffaWebRequest', data: data, success: function (res) { resolve(res); }, fail: function (err) { reject(err); } });
  });
}

function openUrl(url) {
  return new Promise(function (resolve, reject) {
    wx.invokeNativePlugin({ api_name: 'luffaWebRequest', data: { methodName: 'openUrl', url: url }, success: function (res) { resolve(res); }, fail: function (err) { reject(err); } });
  });
}

module.exports = {
  NETWORK: NETWORK,
  create16String: create16String,
  connect: connect,
  signMessage: signMessage,
  verifySignature: verifySignature,
  packageTransaction: packageTransaction,
  packageTransactionV2: packageTransactionV2,
  signAndSubmit: signAndSubmit,
  transfer: transfer,
  getLanguage: getLanguage,
  share: share,
  openUrl: openUrl
};
