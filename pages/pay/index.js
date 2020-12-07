const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const wxpay = require('../../utils/pay.js')
const APP = getApp()
APP.configLoadOK = () => {

}

Page({
  data: {
    wxlogin: true,
    switch1 : true, //switch开关

    addressList: [],
    curAddressData: [],

    totalScoreToPay: 0,
    goodsList: [],
    allGoodsPrice: 0,
    amountReal: 0,
    yunPrice: 0,
    allGoodsAndYunPrice: 0,
    goodsJsonStr: "",
    orderType: "", //订单类型，购物车下单或立即支付下单，默认是购物车，
    pingtuanOpenId: undefined, //拼团的话记录团号
    
    curCoupon: null, // 当前选择使用的优惠券
    curCouponShowText: '请选择使用优惠券', // 当前选择使用的优惠券
    peisongType: 'zq', // 配送方式 kd,zq 分别表示快递/到店自取
    remark: '',

    currentDate: new Date().getHours() + ':' + new Date().getMinutes(),
    formatter(type, value) {
      if (type === 'hour') {
        return `${value}点`;
      } else if (type === 'minute') {
        return `${value}分`;
      }
      return value;
    },
    filter(type, options) {
      if (type === 'minute') {
        return options.filter((option) => option % 10 === 0);
      }
      return options;
    },
  },
  onShow(){
    this.setData({
      shopInfo: wx.getStorageSync('shopInfo'),
      peisongType: wx.getStorageSync('peisongType')
    })
    AUTH.checkHasLogined().then(isLogined => {
      this.setData({
        wxlogin: isLogined
      })
      if (isLogined) {
        this.doneShow()
      }
    })
    AUTH.wxaCode().then(code => {
      this.data.code = code
    })
  },
  async doneShow() {
    let goodsList = [];
    // const token = wx.getStorageSync('token')
    const token = wx.getStorageSync('tableToken')
    //立即购买下单
    if ("buyNow" == this.data.orderType) {
      goodsList = wx.getStorageSync('pingtuanGoodsList')
    } else {
      //购物车下单
      const res = await WXAPI.shippingCarInfo(token)
      if (res.code == 0) {
        goodsList = res.data.items
      }
    }
    this.setData({
      goodsList: goodsList,
      peisongType: this.data.peisongType
    })
    // this.initShippingAddress()
  },

  onLoad(e) {
    let _data = {}
    if (e.orderType) {
      _data.orderType = e.orderType
    }
    if (e.pingtuanOpenId) {
      _data.pingtuanOpenId = e.pingtuanOpenId
    }
    this.setData(_data)
    this.getUserApiInfo()
  },
  selected(e){
    const peisongType = e.currentTarget.dataset.pstype
    this.setData({
      peisongType
    })
    wx.setStorageSync('peisongType', peisongType)
    this.createOrder()
  },
  
  getDistrictId: function (obj, aaa) {
    if (!obj) {
      return "";
    }
    if (!aaa) {
      return "";
    }
    return aaa;
  },
  // 备注
  remarkChange(e){
    this.data.remark = e.detail.value
  },
  goCreateOrder(){
    const mobile = this.data.mobile
    if (this.data.peisongType == 'zq' && !mobile) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      })
      return
    }
    if (!this.data.diningTime) {
      wx.showToast({
        title: '请选择自取/配送时间',
        icon: 'none'
      })
      return
    }
    const subscribe_ids = wx.getStorageSync('subscribe_ids')
    if (subscribe_ids) {
    wx.requestSubscribeMessage({
      tmplIds: subscribe_ids.split(','),
      success(res) {
        
      },
      fail(e) {
        console.error(e)
      },
      complete: (e) => {
        this.createOrder(true)
      },
    })
    } else {
      this.createOrder(true)
    }
  },
  createOrder: function (e) {
    var that = this;
    // var loginToken = wx.getStorageSync('token') // 用户登录 token
    var loginToken = wx.getStorageSync('tableToken')
    var remark = this.data.remark; // 备注信息
    const postData = {
      token: loginToken,
      goodsJsonStr: that.data.goodsJsonStr,
      remark: remark,
      peisongType: that.data.peisongType,
      isCanHx: true
    }
    if (this.data.shopInfo) {
      postData.shopIdZt = this.data.shopInfo.id
      postData.shopNameZt = this.data.shopInfo.name
    }
    if (that.data.kjId) {
      postData.kjid = that.data.kjId
    }
    if (that.data.pingtuanOpenId) {
      postData.pingtuanOpenId = that.data.pingtuanOpenId
    }
    const extJsonStr = {}
    // if (postData.peisongType == 'zq') {
    //   extJsonStr['联系电话'] = this.data.mobile
    //   extJsonStr['取餐时间'] = this.data.diningTime
    // } else {
    //   extJsonStr['送达时间'] = this.data.diningTime
    // }
    postData.extJsonStr = JSON.stringify(extJsonStr)
    // if (e && postData.peisongType == 'kd') {
    //   if (!that.data.curAddressData) {
    //     wx.hideLoading();
    //     wx.showToast({
    //       title: '请设置收货地址',
    //       icon: 'none'
    //     })
    //     return;
    //   }
    //   // 达达配送
    //   if (this.data.shopInfo.number && this.data.shopInfo.expressType == 'dada') {
    //     postData.dadaShopNo = this.data.shopInfo.number
    //     postData.dadaLat = this.data.curAddressData.latitude
    //     postData.dadaLng = this.data.curAddressData.longitude
    //   }
    //   if (postData.peisongType == 'kd') {
    //     postData.provinceId = that.data.curAddressData.provinceId;
    //     postData.cityId = that.data.curAddressData.cityId;
    //     if (that.data.curAddressData.districtId) {
    //       postData.districtId = that.data.curAddressData.districtId;
    //     }
    //     postData.address = that.data.curAddressData.address;
    //     postData.linkMan = that.data.curAddressData.linkMan;
    //     postData.mobile = that.data.curAddressData.mobile;
    //     postData.code = that.data.curAddressData.code;
    //   }      
    // }
    if (that.data.curCoupon) {
      postData.couponId = that.data.curCoupon.id;
    }
    if (!e) {
      postData.calculate = "true";
    }
    // console.log(postData)
    // console.log(e)
    WXAPI.orderCreate(postData)
    .then(function (res) {     
      console.log(res.data) 
      if (res.code != 0) {
        wx.showModal({
          title: '错误',
          content: res.msg,
          showCancel: false
        })
        return;
      }

      if (e && "buyNow" != that.data.orderType) {
        // 清空购物车数据
        WXAPI.shippingCarInfoRemoveAll(loginToken)
      }
      if (!e) {
        const coupons = res.data.couponUserList
        if (coupons) {
          coupons.forEach(ele => {
            let moneyUnit = '元'
            if (ele.moneyType == 1) {
              moneyUnit = '%'
            }
            if (ele.moneyHreshold) {
              ele.nameExt = ele.name + ' [消费满' + ele.moneyHreshold + '元可减' + ele.money + moneyUnit +']'
            } else {
              ele.nameExt = ele.name + ' [减' + ele.money + moneyUnit + ']'
            }
          })
        }
        that.setData({
          totalScoreToPay: res.data.score,
          allGoodsNumber: res.data.goodsNumber,
          allGoodsPrice: res.data.amountTotle,
          allGoodsAndYunPrice: res.data.amountLogistics + res.data.amountTotle,
          yunPrice: res.data.amountLogistics,
          amountReal: res.data.amountReal,
          coupons
        });
        return;
      }
      that.processAfterCreateOrder(res)
    })
  },
  async processAfterCreateOrder(res) {
    // 直接弹出支付，取消支付的话，去订单列表
    // const res1 = await WXAPI.userAmount(wx.getStorageSync('token'))
    const res1 = await WXAPI.userAmount(wx.getStorageSync('userToken'))
    if (res1.code != 0) {
      wx.showToast({
        title: '无法获取用户资金信息',
        icon: 'none'
      })
      wx.redirectTo({
        url: "/pages/all-orders/index"
      });
      return
    }
    const money = res.data.amountReal * 1 - res1.data.balance*1
    if (money <= 0) {
      wx.redirectTo({
        url: "/pages/all-orders/index"
      })
    } else {
      wxpay.wxpay('order', money, res.data.id, "/pages/all-orders/index");
    }
  },
  // async initShippingAddress() {
  //   const res = await WXAPI.defaultAddress(wx.getStorageSync('token'))
  //   if (res.code == 0) {
  //     this.setData({
  //       curAddressData: res.data.info
  //     });
  //   } else {
  //     this.setData({
  //       curAddressData: null
  //     });
  //   }
  //   this.processYunfei();
  // },
  processYunfei() {
    var goodsList = this.data.goodsList
    if (goodsList.length == 0) {
      return
    }
    const goodsJsonStr = []
    var isNeedLogistics = 0;

    let inviter_id = 0;
    let inviter_id_storge = wx.getStorageSync('referrer');
    if (inviter_id_storge) {
      inviter_id = inviter_id_storge;
    }
    for (let i = 0; i < goodsList.length; i++) {
      let carShopBean = goodsList[i];
      if (carShopBean.logistics || carShopBean.logisticsId) {
        isNeedLogistics = 1;
      }

      const _goodsJsonStr = {
        propertyChildIds: carShopBean.propertyChildIds
      }
      if (carShopBean.sku && carShopBean.sku.length > 0) {
        let propertyChildIds = ''
        carShopBean.sku.forEach(option => {
          propertyChildIds = propertyChildIds + ',' + option.optionId + ':' + option.optionValueId
        })
        _goodsJsonStr.propertyChildIds = propertyChildIds
      }
      if (carShopBean.additions && carShopBean.additions.length > 0) {
        let goodsAdditionList = []
        carShopBean.additions.forEach(option => {
          goodsAdditionList.push({
            pid: option.pid,
            id: option.id
          })
        })
        _goodsJsonStr.goodsAdditionList = goodsAdditionList
      }
      _goodsJsonStr.goodsId = carShopBean.goodsId
      _goodsJsonStr.number = carShopBean.number
      _goodsJsonStr.logisticsType = 0
      _goodsJsonStr.inviter_id = inviter_id
      goodsJsonStr.push(_goodsJsonStr)

    }
    this.setData({
      isNeedLogistics: isNeedLogistics,
      goodsJsonStr: JSON.stringify(goodsJsonStr)
    });
    this.createOrder()
  },
  addAddress: function () {
    wx.navigateTo({
      url: "/pages/ad/index"
    })
  },
  selectAddress: function () {
    wx.navigateTo({
      url: "/pages/ad/index"
    })
  },
  bindChangeCoupon: function (e) {
    const selIndex = e.detail.value;
    this.setData({
      curCoupon: this.data.coupons[selIndex],
      curCouponShowText: this.data.coupons[selIndex].nameExt
    })
    this.createOrder()
  },
  radioChange (e) {
    this.setData({
      peisongType: e.detail.value
    })
    this.processYunfei()
  },
  cancelLogin() {
    wx.navigateBack()
  },
  processLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '已取消',
        icon: 'none',
      })
      return;
    }
    AUTH.register(this);
  },
  // async getPhoneNumber(e) {
  //   if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
  //     wx.showToast({
  //       title: e.detail.errMsg,
  //       icon: 'none'
  //     })
  //     return;
  //   }
  //   const res = await WXAPI.bindMobileWxapp(wx.getStorageSync('token'), this.data.code, e.detail.encryptedData, e.detail.iv)
  //   AUTH.wxaCode().then(code => {
  //     this.data.code = code
  //   })
  //   if (res.code === 10002) {
  //     wx.showToast({
  //       title: '请先登陆',
  //       icon: 'none'
  //     })
  //     return
  //   }
  //   if (res.code == 0) {
  //     wx.showToast({
  //       title: '读取成功',
  //       icon: 'success'
  //     })
  //     this.setData({
  //       mobile: res.data
  //     })
  //   } else {
  //     wx.showToast({
  //       title: res.msg,
  //       icon: 'none'
  //     })
  //   }
  // },
  async getUserApiInfo() {
    // const res = await WXAPI.userDetail(wx.getStorageSync('token'))
    const res = await WXAPI.userDetail(wx.getStorageSync('userToken'))
    if (res.code == 0) {
      this.setData({
        mobile: res.data.base.mobile
      })
    }
  },
  diningTimeShow() {
    this.setData({
      diningTimeShow: true
    })
  },
  diningTimeHide() {
    this.setData({
      diningTimeShow: false
    })
  },
  diningTimeConfirm(e) {
    this.setData({
      diningTime: e.detail
    })
    this.diningTimeHide()
  },
})