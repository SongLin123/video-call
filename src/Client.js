import rtcClient from './rtcClient'
import SignalClient from './SignalClient'
import {Howl, Howler} from 'howler';
import {
  EventEmitter
} from 'events'
import ring from './assets/basic_ring.mp3'
import tones from './assets/basic_tones.mp3'


class Client {
  constructor(appid) {
    this.signal = new SignalClient(appid);
    this.rtcclient = new rtcClient(appid);
    this.account;
    this.status = '';
    this.ontalking = false;
    this.remoteaccount;
    this.channel;
    

    this.askSound = new Howl({
      src: [ring],
      loop: true,
      volume: 1.0,
      HTML5: true,
      onloaderror: (id,err) => {
        console.log(id,err)
      },
      onplayerror: (id,err) => {
        console.log(id,err)
      }
    });
    this.answerSound = new Howl({
      src: [tones],
      loop: true,
      volume: 1.0,
      HTML5: true,
      onloaderror: (id,err) => {
        console.log(id,err)
      },
      onplayerror: (id,err) => {
        console.log(id,err)
      }
    });
 

    
    this.events = new EventEmitter();
    this.events.setMaxListeners(4);
    this.events.on('error', () => {
      console.log('error')
    })
    
    this.events.on('endRtc', async () => {
      console.log('endRtc')
      this.rtcclient.end()
    })
  }

  get callRole() {
    return this.signal.callRole;
  }

  get localStreamId() {
    return this.rtcclient.localStreamId;
  }
  get remoteStreamId() {
    return this.rtcclient.remoteStreamId;
  }
  async login(account) {
    if (typeof remotecount === 'Number') Promise.reject('account must be Number')
    let that = this;
    let proxy = new Proxy(this.signal, {
      set: function (target, name) {
        if (name === "callStatus") {
          that.status = target[name];
          if (target[name] === '收到呼叫') {
            that.canAccept = true;
          }
          else {
            that.canAccept = false;
          }
          switch (target[name]) {
            case '接听':
              that.events.emit('openCalling');
              break;
            case '拒绝':
              that.ontalking = false;
              if (that.answerSound.playing()) that.answerSound.stop();
              if (that.askSound.playing()) that.askSound.stop()
              break;
            case '异常':
              that.ontalking = false;
              if (that.askSound.playing()) that.askSound.stop()
              break;
            case '对方不在线':
              that.ontalking = false;
              if (that.askSound.playing()) that.askSound.stop()
              break;
            case '收到呼叫':
              that.ontalking = true;
              that.answerSound.play();
              that.remoteaccount = that.signal.remoteaccount;
              break;
            case '拨通':
              that.ontalking = true;
              break;
            case '对方以停止呼叫':
              that.ontalking = false;
              if (that.answerSound.playing) that.answerSound.stop();
              break;
            case '开始通话':
              that.events.emit('playStream');
              if (that.answerSound.playing()) that.answerSound.stop();
              that.ontalking = true;
              break;
            case '结束':
              that.events.emit('endRtc');
              that.ontalking = false;
              that.remoteaccount = '';
              break;
          }
        }
        return true;
      }
    });
    this.account = account;
    await this.signal.login(account, proxy);
    await this.rtcclient.login(account);

  }
  async calling({
    remotecount,
    localElementId,
    remoteElementId
  }) {
    if (this.signal.userStatus !== 'idle') {
      return
    }

    if (typeof remotecount === 'Number') {
      Promise.reject('account must be Number');
    }
    
    let that = this;

    that.askSound.play();
    if (that.events.listeners('openCalling').length > 0) {
     
      that.events.removeAllListeners('openCalling');
      that.events.removeAllListeners('playStream');
    }
    that.remoteaccount = remotecount;
    this.events.once('openCalling', async () => {
      console.log(EventEmitter.listenerCount(this.events, 'openCalling'));
      console.log('openCalling')
      let channel = that.signal.callRole === 0 ? that.account + remotecount : remotecount + that.account;
      console.log(channel);
      await that.rtcclient.calling(remotecount, localElementId, remoteElementId, channel);
      that.channel = channel;
      that.rtcclient._playlocalStream(localElementId);
      if (that.askSound.playing()) that.askSound.stop()


    })
    this.events.once('playStream', async () => {

      console.log('playStream')

    })
 

    await this.signal.calling(remotecount.toString())



  }

  async endCall() {
    this.signal.end();

    this.rtcclient.end();
    if (this.askSound.playing) this.askSound.stop();
  }

  async refuseCall() {
    await this.signal.refuseCall()
  }
  async acceptCall({
    remotecount,
    localElementId,
    remoteElementId
  }) {
    let that = this;
   
    let channel = that.signal.callRole === 0 ? that.account + remotecount : remotecount + that.account;
    console.log(channel, localElementId,
      remoteElementId);
    await this.signal.acceptCall();

    await that.rtcclient.calling(remotecount, localElementId, remoteElementId, channel);
    that.channel = channel;
    await that.rtcclient._playlocalStream(localElementId);

  }
}
export default Client;
