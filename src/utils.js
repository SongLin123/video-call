
import toastr from 'toastr'
import 'toastr/build/toastr.css'

class Logger{
    constructor(){
        return this
    }
    static log(m){
        console.log(m)
    }
}

class Msg{
    constructor(){
        return this
    }
    static show(m) {
            toastr.success(m)
    }
}



class PromiseWarp{
    constructor(that,func,arg=[]){
        return new Promise((res,rej)=>{

            function success(){
            
                res()
            }
            function fail(err){
                rej(err)
            }
        
            return func.call(that,...arg,success,fail)
        })
    }
}


export {Logger,Msg,PromiseWarp};