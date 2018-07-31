import {
  Logger,
  Msg,
  PromiseWarp
} from './utils'
import './AgoraSig'


class SignalClient {
  constructor(appid) {

    this.proxy;

    this.signal = Signal(appid);
    this.session;
    this.channelName = 'socket333';
    this.channel;
    this.channelUserList;
    this.userStatus;
    this.account;
    this.remoteaccount;
    this.callClient;

    this.callStatus;
    this.callRole; //0为呼叫，1为应答

  }

  set _callStatus(val) {
    this.callStatus = val;
    this.proxy.callStatus = val;

  }
  get _callStatus() {

    return this.callStatus;

  }
  async login(account, proxy) {
    this.proxy = proxy;
    await this._login(account);

    // await this._join(this.channelName);
  }


  async _getUserAttr(account) {
    //传递当前用户的状态，0为不可用，1为可用
    let cb = ({
      result,
      value
    }) => {

      if (result === 'ok') return value === 'idle' ? 1 : 0
    };

    return await this._invoke('io.agora.signal.user_get_attr', {
      'account': account,
      'name': 'status'
    }, cb)
  }
  async _getUserLine(account) {
    //传递当前用户的状态，0为不可用，1为可用
    let cb = ({
      status,
      account,
      result
    }) => {

      if (result === 'ok') return status
    };

    return await this._invoke('io.agora.signal.user_query_user_status', {
      'account': account
    }, cb)

  }
  async getUserStatus(account) {
    //传递当前用户的状态，0为不可用，1为可用
    return (await this._getUserLine(account)) && (await this._getUserAttr(account))
  }

  async calling(account) {
    if (await this.getUserStatus(account)) {
      await new Promise((res, rej) => {
        this.callRole = 0;
        this.channelName = this.account + account.toString();
        let extra = {
          '_require_peer_online': 1, // 如果对方不在线，则立即触发 onInviteFailed 回调,如果对方不在线超过 20 秒，则触发 onInviteFailed 回调（默认）

          '_timeout': 20, // 呼叫超时。超时后收到 inviteFailed 的同时消息被销毁，被叫不再收到。范围：0～30s。
          'channelName': this.channelName, //指定的加入相应媒体频道的 uid。
          'srcNum': this.account //指定的在远端手机屏幕上显示的手机号码。
        }

        this.callClient = this.session.channelInviteUser2(this.channelName, account, JSON.stringify(extra));
        this.callRole = 0;
        this.callClient.onInviteReceivedByPeer = async (extra) => {
          await this._busy();
          this._callStatus = '拨通';
          console.log('拨通')
        }
        this.callClient.onInviteAcceptedByPeer = async (extra) => {

          this._callStatus = '接听'
          await this._join(this.channelName);
          res()

        }
        this.callClient.onInviteRefusedByPeer = async (extra) => {


          await this._idle();
          this._callStatus = '拒绝'

          rej('对方未接受呼叫')
        }
        this.callClient.onInviteFailed = async (extra) => {
          console.log('呼叫失败')

          await this._idle();
          this._callStatus = '异常'
          rej('呼叫失败')
        }

      })

    } else {
      this._callStatus = '对方不在线'
      Promise.reject('对方不在线')
    }
  }
  //收到呼叫
  async _receiveCalling(call) {
    let that = this;
    that.remoteaccount = call['peer'];
    that.channelName = call['channelName'];


    this.callRole = 1;
    this._callStatus = '收到呼叫'
    await this._busy();
    this.callClient = call;
    this.callClient.onInviteEndByPeer = async (extra) => {

      await that._idle();
      that._callStatus = '对方以停止呼叫'
    }
  }
  //接受呼叫
  async acceptCall() {
    this.callClient.channelInviteAccept();
    await this._join(this.channelName);

  }
  //拒绝呼叫
  async refuseCall() {
    this.callClient.channelInviteRefuse();
    await this._idle();
    this._callStatus = '拒绝'

  }
  //结束呼叫
  async _endCall() {
    this.callClient.channelInviteEnd();
    this._callStatus = '结束';
    await this._idle();
  }
  async end() {
    if (this.callRole) {

      switch (this._callStatus) {
        case '拨通':
          await this.refuseCall();
          break;
        case '接听':
          await this._leave();
          break;
        case '开始通话':
          await this._leave();
          break;
        case '结束':

          break;
      }
    } else {

      switch (this._callStatus) {
        case '拨通':
          await this._endCall();
          break;
        case '接听':
          await this._leave();
          break;
        case '开始通话':
          await this._leave();
          break;
        case '结束':

          break;
      }
    }

  }


  async _leave() {
    await new Promise(async (res, rej) => {
      console.log('leave')
      this.channel.channelLeave();
      this._callStatus = "结束";
      await this._idle();
      res()
    })

  }


  async _invoke(func, args, cb) {
    let value;
    await new Promise((res, rej) => {
      this.session.invoke(func, args, (err, val) => {
        if (err) {
          rej(val.reason);
        } else {
          value = cb(val);
          res()
        }
      });
    })
    return value

  }


  async _idle() {

    let cb = (val) => {
      this.userStatus = 'idle';
    };

    await this._invoke('io.agora.signal.user_set_attr',
      {
      'name': 'status',
      'value': 'idle'
      }
      , cb)


  }
  async _busy() {
    let cb = (val) => {
      this.userStatus = 'busy';
    };

    await this._invoke('io.agora.signal.user_set_attr',
      {
      'name': 'status',
      'value': 'busy'
      }
      , cb)

  }

  async _login(account, token = "_no_need_token") {

    await new PromiseWarp(this, (res, rej) => {
      this.account = account;
      if (this.session) this._logout();
      this.session = this.signal.login(account, token);


      this.session.onLoginSuccess = async (uid) => {
        await this._idle();
        console.log('success')
        // this.session.onInviteReceived = this._receiveCalling;
        this.session.onInviteReceived = (...args) => {
          this._receiveCalling(...args)
        }
        res();
      }
      this.session.onError = (evt) => {
        rej(evt)
      }

      this.session.onLoginFailed = (...ecode) => {
        rej(...ecode)
      }
      this.session.onLogout = (ecode) => {
        rej(ecode)
      }



    })
  }
  async _logout() {
    await new PromiseWarp(this, (res, rej) => {
      this.session.logout();
      this.session.onLogout = (ecode) => {
        res(ecode)
      }
    })

  }
  async _join(channelName) {
    await new PromiseWarp(this, (res, rej) => {
      let that = this;
      this.channel = this.session.channelJoin(channelName);

      this.channel.onChannelUserList = (users) => {
        this.channelUserList = users;
        that._callStatus = '开始通话';
        res()
      }

      this.channel.onChannelJoinFailed = (ecode) => {

        rej(ecode)
      }
      // this.channel.onChannelUserJoined =   async(account, uid)=> {
      //   that._callStatus = '开始通话';
      //   res()
      // };
      this.channel.onChannelUserLeaved = async (account, uid) => {
        console.log('远端结束')
        that.end();

      };
      this.channel.onChannelLeadved = () => {
        console.log('本地结束')
        // that._callStatus = '本地结束'
      }
    })

  }



}
export default SignalClient;
