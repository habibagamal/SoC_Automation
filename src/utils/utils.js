'use strict';


const fs = require('fs');

module.exports = {
    //IPs_map is the full IPs_map
    //Slave is the slave in question
    //comp is the component of the slave external or reg
    getSize : function (IP, slave, comp){
        if(IP.params != undefined){
            if (comp.param_used == 1){
                var size = comp.size
                for (var param_idx in IP.params){
                    var param = IP.params[param_idx]
                    size = size.replace(param.name, getParamValueIn(IP,slave,param.name));
                }
                return eval(size);
            }else{
                return comp.size;
            }
        }else{
            return comp.size;
        }
     },
     getParamValue : function (IP, slave, param){
         return getParamValueIn(IP,slave, param)
     }
     
}

function getParamValueIn(IP, slave, param){
    if(slave.params !=undefined){
        for (var i in slave.params){
          
            if(slave.params[i].name == param){
                return slave.params[i].value;
            
            }
        }
    }
    for (var i in IP.params){

        if(IP.params[i].name == param)
            return IP.params[i].default_value;
    }
}