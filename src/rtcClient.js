import AgoraRTC from 'agora-rtc-sdk'
import {
  Logger,
  Msg,
  PromiseWarp
} from './utils'



class rtcClient {
  constructor(appid, ) {

    this.client;
    this.devs;
    this.channel;
    this.localStream;
    this.remoteStream;
    this.uid;
    this.channelKey;
    this.remoteStreams = [];
    this.videoProfile = "720p_6";
    this.dynamicKey = null;
    this.published = false;
    this.muted = false;

    this.remoteElementId;
    this.localElementId
    this.localStreamId;
    this.remoteStreamId;



    let logLevel = AgoraRTC.Logger.NONE;
    AgoraRTC.Logger.setLogLevel(logLevel)


    if (AgoraRTC.checkSystemRequirements()) {
      let con = {
        mode: 'h264_interop'
      } 
      console.log(con )
      this.client = AgoraRTC.createClient(con)

      this.getDevices();
      this._init(appid)

      let that = this;
      this.client.on('peer-leave',  (evt)=> {
        let uid = evt.uid;
      
        console.log("remote user left ", uid);
        that.end();
      });
      this.client.on('stream-removed', (evt)=>{
        console.log("stream-removed");
    
        that.end()
    });
      this.client.on('error', (err)=> {
        console.log("Got error msg:", err.reason);
      });

      this.client.on('stream-subscribed', (evt) => {
        var remoteStream = evt.stream;
        this.remoteStreams.push(remoteStream);

        this.localStreamId = this.localStream.getId();
        this.remoteStreamId = remoteStream.getId()
       
        //play the stream
        this._playremoteStream(this.remoteElementId);

      })

      this.client.on('stream-added', (evt) => {
        console.log('steam-add')
        var remoteStream = evt.stream;
        //subscribe the stream
        this.client.subscribe(remoteStream, (err) => Promise.reject(err));

      })



    } else {
      Msg.show('请为页面添加权限！')
    }
  }
  async _init(appid) {

    await new PromiseWarp(this, this.client.init, [appid])


  }
  async login(account) {
    if (Number(account) !== NaN) {
      this.uid = Number(account);
    } else {
      Promise.reject('account not a number')
    }
    
  }
  async getDynamicKey(channelName) {
    // if dynamic not enabled
    this.channelKey = null;

    // if dynamic key enabled
    // return $.ajax({
    //     url: 'service url to get your dynamic key'
    // })
  }
  async _join(channel, uid) {

    await new PromiseWarp(this, this.client.join, [this.channelKey, channel, uid])
  }

  async _leave() {
    this.peerIn = false;
    await new PromiseWarp(this, this.client.leave)
  }

  async _creatStream() {
    // console.log(this.devs["videoinput"][0])
    let spec = {
      streamID: this.uid,
      audio: true,
      video: true,
      screen: false,
      // cameraId: this.devs["videoinput"][0].deviceId,
      // microphoneId: this.devs["audioinput"][0].deviceId,
    };

    this.localStream = AgoraRTC.createStream(spec);

    this.localStream.setVideoProfile(this.videoProfile);


  }
  async _initStream() {

    await new PromiseWarp(this, this.localStream.init);

  }
  async _playlocalStream(elementId) {
    
    this.localStream.play(elementId);
  
      await new Promise((res, rej) => {
        this.client.publish(this.localStream, (err) => {
          console.log("stream published");
          rej(JSON.stringify(err))
        });

        this.client.on('stream-published', (evt) => {
        
        this.published = true;
        res()
      })

    })


  }
  async _playremoteStream(elementId) {
    this.remoteStreams[0].play(elementId);
    this.ontalking = true;
  }
  async getDevices() {

    await new Promise((resolve, reject) => {
      function error(err) {
        console.log('获取设备失败')
        reject()
      }
      AgoraRTC.getDevices((devices) => {

        if (!!devices[0].label) {

          let dev = {
            audioinput: [],
            audiooutput: [],
            videoinput: []
          };
          for (let i = 0; i < devices.length; i++) {

            dev[devices[i].kind].push(devices[i])

            let length = dev['audioinput'].length + dev['audiooutput'].length + dev['videoinput'].length;
            if (length === devices.length) {

              this.devs = dev;

              resolve()
            }
          }

        } else {
          error()
        }

      })
    })
    return this.devs;

  }

  async calling(remoteUid, localElementId, remoteElementId,channel) {
    this.localElementId = localElementId;
    this.remoteElementId = remoteElementId;
    this.channel = channel;
    // this.channel = remoteUid.toString();
    await this._join(this.channel, this.uid);
    await this._creatStream();
    await this._initStream();



    // this.localStream.on("accessAllowed", async () => {
    // console.log("accessAllowed");


    // this._playlocalStream(localElementId);



    // })



    this.localStream.on("accessDenied", function () {
      console.log("accessDenied");
    })



  }




  async end() {
    if (!!this.localStream===false) {
      return Promise.resolve()
    }
    if (this.published) {
      this.client.unpublish(this.localStream);
      this.published = false;
    }
    this.localStream.close();
    this.localStream = null;

    this.remoteStreams = [];
    await this._leave();
    document.getElementById(this.localElementId).innerHTML='';
    document.getElementById(this.remoteElementId).innerHTML='';

  }
}




export default rtcClient;
