# video-call

一个基于声网（agora.io）的视频通话及信令api制作的一对一语音电话的sdk，支持es2015，支持async函数。

## 使用

  > <div id="localElementId"></div>
  
  > <div id="remoteElementId"></div>
  
  > import Client from "agora";
  
  > let client=new Client("your agora appid");
  
  > client.login("account");
  
  > client.calling({remotecount="remotecount",localElementId="localElementId",remoteElementId="remoteElementId"})
## API

### METHOD
  login(account)
  
  登陆你要使用的uid，必须为数字
  
  
  calling({
    remotecount,
    localElementId,
    remoteElementId
  })
 
    拨打电话
    remotecount 拨打的uid,
    localElementId 本地视频流播放的标签id,
    remoteElementId 远程视频流播放的标签id
    
   endCall() 
   
    结束呼叫
   
   refuseCall()
   
    拒绝接听
   
   
   acceptCall({
    remotecount,
    localElementId,
    remoteElementId
  })
  
    接听电话
    remotecount 拨打的uid,
    localElementId 本地视频流播放的标签id,
    remoteElementId 远程视频流播放的标签id
  
   
  
