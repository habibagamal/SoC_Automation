

const IRQEN_OFF = "40";

const fs = require('fs');
const cp = require('child_process');
let ahb_sys_generator = require("./AHB/ahblite_sys_gen.js")
let ahb_arbiter_generator = require("./AHB/ahb_arbiter_gen.js")
let ahb_masters_mul_generator = require("./AHB/ahb_masters_mul_gen.js")
let ahb_master_generator = require("./AHB/ahb_master_gen.js")
let ahb_buses2master_generator = require("./AHB/ahb_buses2master.js")
let utils = require("./utils/utils.js")


var ip //= JSON.parse(rawdata)
var subsystem
var soc
var masters
var Directory = `../Output/`;
var subSystems_map = new Map()

var module_header = ``

var module_content = `
  
`
var module_declarations = `

`
var module_assignments = ``

var topModuleHeader = ``

var moduleInstantiation =``

var topModules =``

var topModuleContent=``

var testbench = ``
var testbench_header = ``
var testbench_inst = ``
var testbenchs = ``
var testbenchContent = ``

//try{


if(process.argv.length<3){
    console.log("use: node sys_gen.js -help\nto get list of all flags");
}

if(process.argv[2] == "-help"){
    console.log(`-help: get all commands
-outDir Directory: to set the output directory
-soc JSON: to set the json for the main SoC
-subsystem JSONs: to set the files of the external subsystems used (those that are not already in the library)
-IPlib JSON: to set the IPs library location
-mastersLib JSON: to set the masters library location
-SUBlib JSON: to set the subsystems library location`);

throw new Error ("Code Terminated..")
}

function extractInputParameters(){

    for(var i = 0; i < process.argv.length;i++){
       // console.log(i," ", process.argv[i])
       switch(process.argv[i]){
            case "-soc":
                i++; 
                try{   
                    var soc_json = fs.readFileSync(process.argv[i])
                    soc = JSON.parse(soc_json)
                }catch(e){
                    throw new Error ("soc json file doesn't exist")
                }
                break
            case "-outDir":
                i++
                Directory = process.argv[i]
                break
            case "-subsystem":
                var j =i+1;
                for(;process.argv[j] != undefined&&process.argv[j][0]!='-';j++){
                try{
                    var subsytems_json = fs.readFileSync(process.argv[j])
                    subsystem = JSON.parse(subsytems_json)  
                    subSystems_map.set(subsystem.id, subsystem)                    
                }catch(e){
                    throw new Error ("subsystem json "+ process.argv[j]+ "file doesn't exist")
                }
                
                }
                i=j-1;
                break
            case "-IPlib":
                i++;
                try{
                    var ips_json = fs.readFileSync(process.argv[i])
                    ip = JSON.parse(ips_json)
                }catch(e){
                    throw new Error ("ips library json file doesn't exist")
                }
                
                break
            case "-SUBlib":
                i++;
                try{
                var subsytems_json = fs.readFileSync(process.argv[i])
                subsystem = JSON.parse(subsytems_json)  
                }catch(e){
                    throw new Error("subsystems library json file doesn't exist")
                }
                break
            case "-mastersLib":
                i++;
                try{
                var masters_json = fs.readFileSync(process.argv[i])
                masters = JSON.parse(masters_json)  
                }catch(e){
                    throw new Error("subsystems library json file doesn't exist")
                }
                break
        }
    }
}

function validateInputSoC(){
   //check if address_space is power of 2
   if(soc.address_space != (1<<Math.log2(soc.address_space))){
       throw new Error("Address space must be a power of 2")
   }
   //check if page_bits is a multiple of 2
   if(soc.page_bits & 1 == 1){
       throw new Error("page_bits must be a multiple of 2")
   }
}

function createDir(Directory){
    try{
        fs.mkdirSync(Directory, { recursive: true })
    }catch(e){
        
    }
}
//var compiled = 0;

extractInputParameters()
if(ip == undefined) throw new Error ("No IPs library was provided!")
if(soc== undefined) throw new Error ("No SoC description was provided!")
validateInputSoC()
createDir(Directory)
console.log(`Done that`)

topModuleHeader = `
\`timescale 1ns/1ns
module soc_m${soc.masters.length}_b${soc.buses.length}(
\tinput HCLK, 
\tinput HRESETn,
\tinput [7: 0] Input_DATA,
\tinput [0: 0] Input_irq,
\toutput Output_DATA`


moduleInstantiation =`

//SoC Module Instantiation

soc_core_m${soc.masters.length}_b${soc.buses.length} uut(
\t.HCLK(HCLK), 
\t.HRESETn(HRESETn),
\t.Input_DATA(Input_DATA),
\t.Input_irq(Input_irq),
\t.Output_DATA(Output_DATA)`

module_header = `
\`timescale 1ns/1ns
module soc_core_m${soc.masters.length}_b${soc.buses.length}(
\tinput HCLK, 
\tinput HRESETn,
\tinput [7: 0] Input_DATA,
\tinput [0: 0] Input_irq,
\toutput Output_DATA`

buses_gen()

fs.writeFile(Directory+"soc_core_m"+soc.masters.length+"_b"+soc.buses.length+".v", module_header+module_declarations+module_assignments+module_content, (err) => {
  if (err)
      throw err; 
})

moduleInstantiation+=`);\n\n`
topModuleHeader+=`);\n\n`
topModuleContent+=moduleInstantiation
topModuleContent+=`\n\n\nendmodule`

// form_testbench()

fs.writeFile(Directory+"soc_m"+soc.masters.length+"_b"+soc.buses.length+".v", topModuleHeader+topModules+topModuleContent, (err) => {
    if (err)
        throw err; 
  })
/*
} catch(e){
    //console.log(e.name)
    console.log(e.message)
}*/

  

function buses_gen(){
	var IPs_map = new Map();
    for (bus_index in soc.buses){

        var slaves = soc.buses[bus_index].slaves
        var subSystems = soc.buses[bus_index].subsystems
        
        //create map for IPs
        for (var slave_index in slaves){
            var type = slaves[slave_index].type
            if(ip[type] == undefined) throw new Error("IP type "+toString(type)+" doesn't exist in the IPs library")
            if (type < ip.length){
                IPs_map.set(type, ip[type])
                // copying files
                if (ip[type].files != undefined){
                    for (i in ip[type].files){
                        let file = ip[type].files[i]
                        try{   
                            var module = fs.readFileSync("./IPs/"+file)
                        }catch(e){
                            throw new Error("slave file doesn't exist " + ip[type].name)
                        }
                        var n = file.lastIndexOf('/');
                        var filename = file.substring(n + 1);  

                        fs.writeFile(Directory+filename, module, (err) => {
                            if (err)
                                throw err; 
                          })
                    }
                }
            }
        }
        //add library subsystems to subsystems map
        for (var subSystem_index in subSystems){
            var id = subSystems[subSystem_index].id
            if(subSystems_map.get(id) == undefined){
                if(subsystem == undefined) throw new Error("You didn't provide subsystems library")
                if (id < subsystem.length)
                    subSystems_map.set(id, subsystem[id])
                else
                    throw new Error ("Subsystem ID "+toString(id)+" doesn't exist in the subsystems provided")
            }
        }

        //Adding sub-systems IPs
        for(var subSystem_index in subSystems){
            for (var slave_index in subSystems_map.get(subSystems[subSystem_index].id).slaves){
            var type = subSystems_map.get(subSystems[subSystem_index].id).slaves[slave_index].type
            if(ip[type] == undefined) throw new Error("IP type "+toString(type)+" doesn't exist in the IPs library")
            if (type < ip.length)
                IPs_map.set(type, ip[type])
                // copying files
                if (ip[type].files != undefined){
                    for (i in ip[type].files){
                        let file = ip[type].files[i]
                        try{   
                            var module = fs.readFileSync("./IPs/"+file)
                        }catch(e){
                            throw new Error("slave file doesn't exist "  + ip[type].name)
                        }

                        var n = file.lastIndexOf('/');
                        var filename = file.substring(n + 1);  

                        fs.writeFile(Directory+filename, module, (err) => {
                            if (err)
                                throw err; 
                          })
                    }
                }
            }
        }

        //Bus selection
        if(soc.buses[bus_index].type == 0){
          ahb_sys_gen(IPs_map,subSystems_map,soc.buses[bus_index],soc.address_space,soc.page_bits)
        }
        
        var busSignalsOut = false;
        //External Signals Connection
        for(var slave_index in slaves){
            if(IPs_map.get(slaves[slave_index].type) == undefined){
                fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
                    // In case of a error throw err. 
                    if (err) throw err; 
                }) 
            }

            if (slaves[slave_index].type == 9){
                topModuleHeader += `,\n\toutput [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                moduleInstantiation+= `,\n\t.db_reg_Sys${soc.buses[bus_index].id}(db_reg_Sys${soc.buses[bus_index].id})`
                module_header += `,\n\toutput [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                testbench_header += `;\n\twire [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                testbench_inst += `\n\t\t.db_reg_Sys${soc.buses[bus_index].id}(db_reg_Sys${soc.buses[bus_index].id}),`
            }

            if (IPs_map.get(slaves[slave_index].type).connected_to != undefined){
                if (IPs_map.get(slaves[slave_index].type).connected_to[slaves[slave_index].connected_to].placement == "soc_core"){
                    for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                        var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                        module_declarations += `\n\t`+`wire [${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                    }
                    continue;
                }
            }

            if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
                for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                    var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                    module_header += `,\n\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                    
                    let condition = slaves[slave_index].connected_to == undefined
                    if (IPs_map.get(slaves[slave_index].type).connected_to != undefined && slaves[slave_index].connected_to != undefined)
                        condition |= IPs_map.get(slaves[slave_index].type).connected_to[slaves[slave_index].connected_to].placement == "testbench"
                    if (condition){
                        // topModuleHeader += `,\n\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                        // testbench_header += `;\n\t`+(external.input?`wire `:`wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                        // testbench_inst += `\n\t\t.PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}(PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    }
                    else
                        topModules += `\n\twire ` + `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                    
                        moduleInstantiation+= `,\n\t.${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}(${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                }
            }else{
                //Declaring system'declarations Hard Modules' signals and extracting them outside of the main soc module
                topModuleContent+= digital_modules_instantiation_AHB(IPs_map,slaves, slave_index,soc.buses[bus_index].id)
                    
                for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                    var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                    
                    let condition = slaves[slave_index].connected_to == undefined
                    if (IPs_map.get(slaves[slave_index].type).connected_to != undefined && slaves[slave_index].connected_to != undefined)
                        condition |= IPs_map.get(slaves[slave_index].type).connected_to[slaves[slave_index].connected_to].placement == "testbench"
                    if (condition){
                        // topModuleHeader += `,\n\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                        // testbench_header += `;\n\t`+(external.input?`wire `:`wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                        // testbench_inst += `\n\t\t.PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}(PAD_${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    }
                    else
                        topModules += `\n\twire ` + `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                }   
                if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
                    if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                        for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                            var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                            var size = parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg));
                            if (reg.fields != undefined){
                                for (var i = 0; i < reg.fields.length; i++){
                                    var regFSize= parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i]))
                                    module_header += `,\n\t`+(reg.access?`input`:`output`) +`[${regFSize - 1}: 0] ${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                                    moduleInstantiation+= `,\n\t.${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_S${slave_index}(${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                                    topModules+=`\n\twire [${regFSize - 1}: 0] ${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                                }
                            } else {
                                module_header += `,\n\t`+(reg.access?`input`:`output`) +`[${size - 1}: 0] ${reg.port}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                                moduleInstantiation+=`,\n\t.${reg.port}_Sys${soc.buses[bus_index].id}_S${slave_index}(${reg.port}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                                topModules += `\n\twire [${size - 1}: 0] ${reg.port}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                            }
                            if(reg.access_pulse != undefined){
                                module_header += `,\n\t output ${reg.access_pulse}_Sys${soc.buses[bus_index].id}_S${slave_index}`
                                moduleInstantiation+=`,\n\t.${reg.access_pulse}_Sys${soc.buses[bus_index].id}_S${slave_index}(${reg.access_pulse}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                                topModules += `\n\twire ${reg.access_pulse}_Sys${soc.buses[bus_index].id}_S${slave_index};`
                            }
                        } 
                    }          
                }else{  
                    if(busSignalsOut == false){
                        module_header+=`,\n\t\toutput HCLK_Sys${soc.buses[bus_index].id},
                        output HRESETn_Sys${soc.buses[bus_index].id},
                        output [${soc.address_space-1}:0] HADDR_Sys${soc.buses[bus_index].id},
                        output HWRITE_Sys${soc.buses[bus_index].id},
                        output [31 : 0] HWDATA_Sys${soc.buses[bus_index].id},
                        output [1 : 0] HTRANS_Sys${soc.buses[bus_index].id},
                        output [2 : 0] HSIZE_Sys${soc.buses[bus_index].id},
                        output HREADY_Sys${soc.buses[bus_index].id},
                        output [1 : 0] HRESP_Sys${soc.buses[bus_index].id}`

                        topModules+=`\n\t\twire HCLK_Sys${soc.buses[bus_index].id};
                        wire HRESETn_Sys${soc.buses[bus_index].id};
                        wire [${soc.address_space-1}:0] HADDR_Sys${soc.buses[bus_index].id};
                        wire HWRITE_Sys${soc.buses[bus_index].id};
                        wire [31 : 0] HWDATA_Sys${soc.buses[bus_index].id};
                        wire [1 : 0] HTRANS_Sys${soc.buses[bus_index].id};
                        wire [2 : 0] HSIZE_Sys${soc.buses[bus_index].id};
                        wire HREADY_Sys${soc.buses[bus_index].id};
                        wire [1 : 0] HRESP_Sys${soc.buses[bus_index].id};`
                    
                        moduleInstantiation+=`,\n\t\t.HCLK_Sys${soc.buses[bus_index].id}(HCLK_Sys${soc.buses[bus_index].id}),
                        .HRESETn_Sys${soc.buses[bus_index].id}(HRESETn_Sys${soc.buses[bus_index].id}),
                        .HADDR_Sys${soc.buses[bus_index].id}(HADDR_Sys${soc.buses[bus_index].id}),
                        .HWRITE_Sys${soc.buses[bus_index].id}(HWRITE_Sys${soc.buses[bus_index].id}),
                        .HWDATA_Sys${soc.buses[bus_index].id}(HWDATA_Sys${soc.buses[bus_index].id}),
                        .HTRANS_Sys${soc.buses[bus_index].id}(HTRANS_Sys${soc.buses[bus_index].id}),
                        .HSIZE_Sys${soc.buses[bus_index].id}(HSIZE_Sys${soc.buses[bus_index].id}),
                        .HREADY_Sys${soc.buses[bus_index].id}(HREADY_Sys${soc.buses[bus_index].id}),
                        .HRESP_Sys${soc.buses[bus_index].id}(HRESP_Sys${soc.buses[bus_index].id})`
                    
                        busSignalsOut = true;
                    }
                    module_header += `,\n\t\toutput wire HSEL_Sys${soc.buses[bus_index].id}_S${slave_index},`
                    module_header += `\n\t\tinput wire [31 : 0] HRDATA_Sys${soc.buses[bus_index].id}_S${slave_index},`
                    module_header += `\n\t\tinput wire HREADY_Sys${soc.buses[bus_index].id}_S${slave_index}`
                   

                    moduleInstantiation += `,\n\t\t.HSEL_Sys${soc.buses[bus_index].id}_S${slave_index}(HSEL_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    moduleInstantiation += `\n\t\t.HRDATA_Sys${soc.buses[bus_index].id}_S${slave_index}(HRDATA_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    moduleInstantiation += `\n\t\t.HREADY_Sys${soc.buses[bus_index].id}_S${slave_index}(HREADY_Sys${soc.buses[bus_index].id}_S${slave_index})`
                   
                    var tmpSlaveInterface = IPs_map.get(slaves[slave_index].type).busInterface
    
                    if(tmpSlaveInterface.HSEL != null)
                        topModules += `\n\t\twire HSEL_Sys${soc.buses[bus_index].id}_S${slave_index};`
                    if(tmpSlaveInterface.HRDATA != null)
                        topModules += `\n\t\twire [31 : 0] HRDATA_Sys${soc.buses[bus_index].id}_S${slave_index};`
                    if(tmpSlaveInterface.HREADY != null)
                        topModules += `\n\t\twire HREADY_Sys${soc.buses[bus_index].id}_S${slave_index};`
                    
                }
            }
      }
      for (var subSystem_index in subSystems){ 
          var subBusSignalsOut = false
          var subSystem = subSystems_map.get(subSystems[subSystem_index].id)
          for(var slave_index in subSystem.slaves){
              if(IPs_map.get(subSystem.slaves[slave_index].type) == undefined){
                  fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + subSystem.slaves[slave_index].type, (err) => { 
                      // In case of a error throw err. 
                      if (err) throw err; 
                  }) 
              }

                if (subSystem.slaves[slave_index].type == 9){
                    topModuleHeader += `,\n\toutput [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                    moduleInstantiation+= `,\n\t.db_reg_Sys${soc.buses[bus_index].id}(db_reg_Sys${soc.buses[bus_index].id})`
                    module_header += `,\n\toutput [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                    testbench_header += `;\n\twire [3:0] db_reg_Sys${soc.buses[bus_index].id}`
                    testbench_inst += `\n\t\t.db_reg_Sys${soc.buses[bus_index].id}(db_reg_Sys${soc.buses[bus_index].id}),`
                }

                if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to != undefined){
                    if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to[subSystem.slaves[slave_index].connected_to].placement == "soc_core"){
                        continue;
                    }
                }

                if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to != undefined){
                    if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to[subSystem.slaves[slave_index].connected_to].placement == "soc_core"){
                        continue;
                    }
                }
            
            if(IPs_map.get(subSystem.slaves[slave_index].type).module_type != "hard"){
                for (var ext_typex in IPs_map.get(subSystem.slaves[slave_index].type).externals){
                    var external = IPs_map.get(subSystem.slaves[slave_index].type).externals[ext_typex]
                    module_header += `,\n\t\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                    
                    let condition = subSystem.slaves[slave_index].connected_to == undefined
                    if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to != undefined && subSystem.slaves[slave_index].connected_to != undefined)
                        condition |= IPs_map.get(subSystem.slaves[slave_index].type).connected_to[subSystem.slaves[slave_index].connected_to].placement == "testbench"
                    if (condition){                    
                        // topModuleHeader += `,\n\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                        // testbench_header += `;\n\t`+(external.input?`wire `:`wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                        // testbench_inst += `\n\t\t.PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),`
                    }
                    else 
                        topModules += `\n\t\twire `+ `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                    moduleInstantiation +=  `,\n\t\t.${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                }
            }else{
                topModuleContent+= digital_modules_instantiation_APB(subSystem.slaves, slave_index, IPs_map, soc.buses[bus_index].id, subSystem_index)
                for (var ext_typex in IPs_map.get(subSystem.slaves[slave_index].type).externals){
                    var external = IPs_map.get(subSystem.slaves[slave_index].type).externals[ext_typex]
                    let condition = subSystem.slaves[slave_index].connected_to == undefined
                    if (IPs_map.get(subSystem.slaves[slave_index].type).connected_to != undefined && subSystem.slaves[slave_index].connected_to != undefined)
                        condition |= IPs_map.get(subSystem.slaves[slave_index].type).connected_to[subSystem.slaves[slave_index].connected_to].placement == "testbench"
                    if (condition){     
                        // topModuleHeader += `,\n\t`+(external.input?`input wire `:`output wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                        // testbench_header += `;\n\t`+(external.input?`wire `:`wire ` )+ `[${external.size - 1}: 0] PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                        // testbench_inst += `\n\t\t.PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(PAD_${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),`
                    }
                    else 
                        topModules += `\n\t\twire `+ `[${external.size - 1}: 0] ${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                }
                //Declaring subsystem'declarations Hard Modules' signals and extracting them outside of the main soc module
                if(IPs_map.get(subSystem.slaves[slave_index].type).interface_type == "GEN"){
                    if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                        for (var reg_typex in IPs_map.get(subSystem.slaves[slave_index].type).regs){
                            var reg = IPs_map.get(subSystem.slaves[slave_index].type).regs[reg_typex]
                            var size = parseInt(utils.getSize(IPs_map.get(subSystem.slaves[slave_index].type),subSystem.slaves[slave_index],reg));
                            if (reg.fields != undefined){
                                for (var i = 0; i < reg.fields.length; i++){
                                    var regFSize = parseInt(utils.getSize(IPs_map.get(subSystem.slaves[slave_index].type),subSystem.slaves[slave_index],reg.fields[i]))
                                    module_header += `,\n\t\t`+(reg.access?`input`:`output`) +`[${regFSize - 1}: 0] ${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                                    topModules += `\n\t\twire [${regFSize - 1}: 0] ${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                                    moduleInstantiation += `,\n\t\t.${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                                    
                                }
                            } else {
                                module_header += `,\n\t\t`+(reg.access?`input`:`output`) +`[${size - 1}: 0] ${reg.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                                topModules += `\n\t\twire [${size - 1}: 0] ${reg.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                                moduleInstantiation += `,\n\t\t.${reg.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(${reg.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                            }
                            if(reg.access_pulse != undefined){
                                module_header += `,\n\t output ${reg.access_pulse}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`
                                moduleInstantiation+=`,\n\t.${reg.access_pulse}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(${reg.access_pulse}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                                topModules += `\n\twire ${reg.access_pulse}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                            }
                        }    
                    }  
                }else{       //NON-GENERIC HARD MODULES
                    if(subBusSignalsOut == false){
                        module_header+=`,\n\t\toutput wire PCLK_Sys${soc.buses[bus_index].id}_SS${subSystem_index},
                        output wire PRESETn_Sys${soc.buses[bus_index].id}_SS${subSystem_index},
                        output wire [${(soc.address_space)-1}:0] PADDR_Sys${soc.buses[bus_index].id}_SS${subSystem_index},
                        output wire PWRITE_Sys${soc.buses[bus_index].id}_SS${subSystem_index},
                        output wire [31:0] PWDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index},
                        output wire PENABLE_Sys${soc.buses[bus_index].id}_SS${subSystem_index}
                    `   
                        topModules+=`\n\t\twire PCLK_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    wire PRESETn_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    wire [${(soc.address_space)-1}:0] PADDR_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    wire PWRITE_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    wire [31:0] PWDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    wire PENABLE_Sys${soc.buses[bus_index].id}_SS${subSystem_index};
                    `   
                        moduleInstantiation+=`,\n\t\t.PCLK_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PCLK_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                        .PRESETn_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PRESETn_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                        .PADDR_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PADDR_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                        .PWRITE_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PWRITE_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                        .PWDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PWDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                        .PENABLE_Sys${soc.buses[bus_index].id}_SS${subSystem_index}(PENABLE_Sys${soc.buses[bus_index].id}_SS${subSystem_index})
                        `
                        subBusSignalsOut = true;
                    }
                    
                    module_header+=`        
                    // APB Slave Signals
                    ,input [31:0] PRDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index},
                    output PSEL_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index},
                    input PREADY_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}`       
            
                    moduleInstantiation+=`,\n\t\t.PRDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(PRDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),
                    .PSEL_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(PSEL_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),
                    .PREADY_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}(PREADY_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`       


                    var tmpSlaveInterface = IPs_map.get(subSystem.slaves[slave_index].type).busInterface

                    if(tmpSlaveInterface.PSEL != null)
                        topModules+= `\n\t\twire PSEL_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                    if(tmpSlaveInterface.PRDATA != null)
                        topModules+= `\n\t\twire [31:0] PRDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                    if(tmpSlaveInterface.PREADY != null)
                        topModules+= `\n\t\twire PREADY_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                }
            }
          }
      }
  }

    module_header+=`
    );`


    external_conections(IPs_map)
    IOsInstantiation(IPs_map)
    if (soc.masters_type == 0){
        var masters_map = new Map(); 
        masters_map_gen(masters_map, IPs_map, subSystems_map, soc.address_space)
        masters_arr = [];
        for (const[key, arr] of masters_map.entries()){
            if (masters_arr.length == 0)
                masters_arr = [[key, arr]]                
            else
                masters_arr.push([key, arr])   
        }
        createRegsFile(masters_arr, IPs_map, subSystems_map, soc.address_space)

        dummy_masters_gen(IPs_map, soc.address_space, soc.page_bits, masters_map);
    }
    else if (soc.masters_type == 1){
        var masters_map = new Map(); 
        real_masters_instantiation(masters_map, soc.address_space);  
        masters_arr = [];
        for (const[key, arr] of masters_map.entries()){
            if (masters_arr.length == 0)
                masters_arr = [[key, arr[1]]]                
            else
                masters_arr.push([key, arr[1]])    
        }
        createRegsFile(masters_arr, IPs_map, subSystems_map, soc.address_space)
        form_testbench()
    }

  module_content += `
 
  endmodule
  `

}

function arbiter_gen(bus){
    var NUMM = bus.masters.length;
    var NUMS = 0;
    if (bus.slaves != undefined)
        NUMS = NUMS + bus.slaves.length;
    if (bus.subSystems != undefined)  
        NUMS = NUMS + bus.subsystems.length;
    
    if(NUMM <2 || NUMS < 2) return 0;

    var prefix = "AHB_sys_"+bus.id.toString()
    createDir(Directory+prefix+"/")
    ahb_arbiter_generator.ahb_arbiter_gen(NUMM,NUMS,Directory+prefix+"/")
    ahb_masters_mul_generator.ahb_masters_mul_gen(NUMM,prefix,soc.address_space,Directory)
    return 1;
}

function printRegistersAddress(sys, address_space, register,  page, page_bits, subpage, subpage_bits){
    var line = ""; 
    let offset = parseInt(register.offset) << 2
    let page_bit_count = page_bits/4 - page.length
    var offset_bit_count;
    var subpage_bit_count;
    if (sys == 1)
        offset_bit_count = (address_space - page_bits) /4 - offset.toString(16).length
    else if (sys == 0){
        offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length
        subpage_bit_count = subpage_bits/4 - subpage.length
    }

    line += `0x`
    while (page_bit_count > 0){
        line += `0`
        page_bit_count--
    }
    line += `${page}`

    if (sys == 0){
        while (subpage_bit_count > 0){
            line += `0`
            subpage_bit_count--
        }
        line += `${subpage}`
    }

    while (offset_bit_count > 0){
        line += `0`
        offset_bit_count--
    }
    line += `${offset.toString(16)}`
    return line;
}

function createRegsFile(masters_arr, IPs_map, subSystems_map, address_space){
    let page_bits = soc.page_bits;
    for (i in masters_arr){
        buses_arr = {}
        master_id = masters_arr[i][0]
        buses_arr = masters_arr[i][1]

        var subsystems_arr = new Array
        var soc_arr = new Array
        for (var bus_arr_index in buses_arr){
            var system = {}
            system["system_id"] = buses_arr[bus_arr_index].id
            system["IPs"] = new Array
            system["subsystems"] = new Array

            subsystems_arr = subsystems_arr.concat(buses_arr[bus_arr_index].subsystems)
            
            slaves = buses_arr[bus_arr_index].slaves
            for(var slave_index in slaves){
                let page = slaves[slave_index].page.toString(16);

                let type = slaves[slave_index].type;

                var writeRegisters = new Array();
                var readRegisters = new Array(); 
                if (IPs_map.get(type).regs != undefined){
                    for (var i = 0; i < IPs_map.get(type).regs.length; i++){
                        let access = IPs_map.get(type).regs[i].access;
                        var obj = new Object();
                        obj.reg_name = IPs_map.get(type).regs[i].port;
                        obj.fields = new Array
                        obj.address = printRegistersAddress(0, address_space, IPs_map.get(type).regs[i], page, page_bits, 0, 0);
                        
                        let last_field_end = -1
                        for (field_idx in IPs_map.get(type).regs[i].fields){
                            fields_temp = {}
                            start = IPs_map.get(type).regs[i].fields[field_idx].offset
                            end = IPs_map.get(type).regs[i].fields[field_idx].offset + IPs_map.get(type).regs[i].fields[field_idx].size - 1
                            
                            if (last_field_end < start - 1) {
                                fields_temp["name"] = "no_field"
                                fields_temp["start_bit"] = last_field_end + 1
                                fields_temp["end_bit"] = start - 1
                                obj.fields.push(fields_temp)
                            }

                            fields_temp = {}
                            fields_temp["name"] = IPs_map.get(type).regs[i].fields[field_idx].name
                            fields_temp["start_bit"] = start
                            fields_temp["end_bit"] = end
                            obj.fields.push(fields_temp)

                            last_field_end = end
                        }
                        if (last_field_end != IPs_map.get(type).regs[i].size - 1){
                            fields_temp = {}
                            fields_temp["name"] = "no_field"
                            fields_temp["start_bit"] = last_field_end + 1
                            fields_temp["end_bit"] = IPs_map.get(type).regs[i].size - 1
                            obj.fields.push(fields_temp)
                        }

                        if (access == 1)
                        readRegisters.push(obj);
                        else 
                        writeRegisters.push(obj);
                    }
                }

                var temp = {}
                if (readRegisters.length > 0 | writeRegisters.length > 0)
                    temp["IP_name"] = IPs_map.get(type).name
                if (readRegisters.length > 0){
                    temp["read_registers"] = readRegisters
                }
                if (writeRegisters.length > 0){
                    temp["write_registers"] = writeRegisters 
                }
                
                if (readRegisters.length > 0 | writeRegisters.length > 0)
                    system["IPs"].push(temp)
            }

            for (var subsystem_index in subsystems_arr){
                if (subsystems_arr[subsystem_index] == undefined)
                  continue;
                
                var  id = subsystems_arr[subsystem_index].id
                var subsystem_obj = {}
                subsystem_obj["subsystem_id"] = id
                subsystem_obj["IPs"] = new Array
                
                var subsystem = subSystems_map.get(id)

                let page = subsystems_arr[subsystem_index].page;

                let slaves = subsystem.slaves;                
                
                for (var slave_index in slaves){
                    let subpage = slave_index;
                    let type = slaves[slave_index].type;
                    var writeRegisters = new Array();
                    var readRegisters = new Array(); 
                    let subpage_bits = subsystem.subpage_bits;
                    if (IPs_map.get(type).regs != undefined){
                        for (var i = 0; i < IPs_map.get(type).regs.length; i++){
                            let offset = IPs_map.get(type).regs[i].offset;
                            let access = IPs_map.get(type).regs[i].access;
                            var obj = new Object();
                            obj.address = printRegistersAddress(0, address_space, IPs_map.get(type).regs[i], page, page_bits, subpage, subpage_bits);
                            obj.port = IPs_map.get(type).regs[i].port;
                            obj.fields = new Array

                            let last_field_end = -1
                            for (field_idx in IPs_map.get(type).regs[i].fields){
                                fields_temp = {}
                                start = IPs_map.get(type).regs[i].fields[field_idx].offset
                                end = IPs_map.get(type).regs[i].fields[field_idx].offset + IPs_map.get(type).regs[i].fields[field_idx].size - 1
                                
                                if (last_field_end < start - 1) {
                                    fields_temp["name"] = "no_field"
                                    fields_temp["start_bit"] = last_field_end + 1
                                    fields_temp["end_bit"] = start - 1
                                    obj.fields.push(fields_temp)
                                }

                                fields_temp = {}
                                fields_temp["name"] = IPs_map.get(type).regs[i].fields[field_idx].name
                                fields_temp["start_bit"] = start
                                fields_temp["end_bit"] = end
                                obj.fields.push(fields_temp)

                                last_field_end = end
                            }
                            if (last_field_end != IPs_map.get(type).regs[i].size - 1){
                                fields_temp = {}
                                fields_temp["name"] = "no_field"
                                fields_temp["start_bit"] = last_field_end + 1
                                fields_temp["end_bit"] = IPs_map.get(type).regs[i].size - 1
                                obj.fields.push(fields_temp)
                            }

                            if (access == 1)
                            readRegisters.push(obj);
                            else 
                            writeRegisters.push(obj);
                        }
                    }

                    var temp = {}
                    if (readRegisters.length > 0 | writeRegisters.length > 0)
                        temp["IP_name"] = IPs_map.get(type).name
                    if (readRegisters.length > 0)
                        temp["read_registers"] = readRegisters
                    if (writeRegisters.length > 0)
                        temp["write_registers"] = writeRegisters 
                    
                    if (readRegisters.length > 0 | writeRegisters.length > 0)
                        subsystem_obj["IPs"].push(temp)
                }
                system["subsystems"].push(subsystem_obj)
            }
            soc_arr.push(system)
        }
        fs.writeFile(Directory+"M_" + master_id+ "_registers.txt", JSON.stringify(soc_arr), (err) => {
            if (err)
                throw err; 
          })
    }
}

function masters_map_gen(masters_map){
    var line = "";
    let page_bits = soc.page_bits;
	for (bus_index in soc.buses){
    	for (master_index in soc.buses[bus_index].masters){
            let master_id = soc.buses[bus_index].masters[master_index];
            let startingPage = parseInt(soc.buses[bus_index].starting_page, 16)
            let endPage = parseInt(soc.buses[bus_index].starting_page, 16) + soc.buses[bus_index].number_of_pages
            module_declarations += `\n\twire M${master_id}_HBUSREQ_Sys${soc.buses[bus_index].id};`
            module_assignments += `\n\tassign M${master_id}_HBUSREQ_Sys${soc.buses[bus_index].id} = ( M${master_id}_HBUSREQ  && ( M${master_id}_HADDR[${soc.address_space - 1}:${soc.address_space - soc.page_bits}]
                >= ${soc.page_bits}'d${startingPage} && M${master_id}_HADDR[${soc.address_space - 1}:${soc.address_space - soc.page_bits}]
                < ${soc.page_bits}'d${endPage})) ? M${master_id}_HBUSREQ : 1'b0;\n`

	    	
	    	if(masters_map.has(master_id)){
	    		let arr = masters_map.get(master_id)
	    		arr.push(soc.buses[bus_index])
	    		masters_map.set(master_id, arr)
	    	} else {
	    		masters_map.set(master_id, [soc.buses[bus_index]])
	    	}
	    }
    }

}

function dummy_masters_gen(IPs_map, address_space, page_bits, masters_map){
    var count = 0
	for (const[master_id, buses_arr] of masters_map.entries()){
        count ++

        var subsystems_arr = new Array
        for (var bus_arr_index in buses_arr){
            subsystems_arr = subsystems_arr.concat(buses_arr[bus_arr_index].subsystems)
        }

        if (buses_arr.length > 1){
            var prefix = "AHB_sys_"+bus.id.toString()
            createDir(Directory+prefix+"/")
			ahb_buses2master_generator.ahb_buses2master_gen(master_id, buses_arr, address_space, page_bits,Directory+prefix+"/");
			module_content += ahb_buses2master_generator.ahb_buses2master_instantiation(master_id, buses_arr, address_space, page_bits);
			
            var slaves_arr = new Array;

			for (var bus_index in masters_map.get(master_id)){
                slaves_arr = slaves_arr.concat(masters_map.get(master_id)[bus_index].slaves)
                if (bus_index == 0)
                    module_assignments += `\n\tassign M${master_id}_HGRANT = `
                
                module_assignments += `(M${master_id}_HBUSREQ_Sys${masters_map.get(master_id)[bus_index].id}) ? 
                        M${master_id}_HGRANT_Sys${masters_map.get(master_id)[bus_index].id} :`
            }
            module_assignments += `1'b0;\n`

            if (count%2 == 0)
                slaves_arr = slaves_arr.reverse();
			ahb_master_generator.ahb_master_gen(master_id, slaves_arr, subsystems_arr,subSystems_map, IPs_map, address_space, page_bits,Directory);
            
		} else {
			ahb_master_generator.ahb_master_gen(master_id, masters_map.get(master_id)[0].slaves, masters_map.get(master_id)[0].subsystems,subSystems_map, IPs_map, address_space, page_bits,Directory);
		}
		
		module_declarations+=`
       
\twire [${address_space - 1}: 0] M${master_id}_HADDR;
\twire [31: 0] M${master_id}_HWDATA;
\twire M${master_id}_HWRITE;
\twire [1: 0] M${master_id}_HTRANS;
\twire [2:0] M${master_id}_HSIZE;
        
\twire M${master_id}_HREADY;
\twire [31: 0] M${master_id}_HRDATA;
        
\twire [3:0] M${master_id}_HPROT;
\twire [2:0] M${master_id}_HBURST;
\twire M${master_id}_HBUSREQ;
\twire M${master_id}_HLOCK;
\twire M${master_id}_HGRANT;
    `
    	module_content += ahb_master_generator.ahb_master_instantiation(master_id)

    	
	}
}

function interrupt_line_connection(master_id, master){

    module_content += `
\n\t\t//Interrupts\n`
        // interrupt line connection specified in slave
    if (master.cfg.irq == 0)
        return;
    module_assignments += `\n\tassign M${master_id}_IRQ = ${master.cfg.irq}'b0;\n`
    module_declarations += `wire [${master.cfg.irq - 1}: 0] M${master_id}_IRQ;\n`
    module_content += `\n\t\t.IRQ(M${master_id}_IRQ),`
    for (bus_index in soc.buses){
        let bus = soc.buses[bus_index]
        for (slave_index in bus.slaves){
            if (bus.slaves[slave_index].irq_conn != undefined){
                if (bus.slaves[slave_index].irq_conn.master_id == master_id)
                    module_assignments += `\tassign M${master_id}_IRQ[${bus.slaves[slave_index].irq_conn.line}] = IRQ_Sys${soc.buses[bus_index].id}_S${slave_index};\n`

            }
        }
        if (bus.subsystems != undefined){
            for (subsystem_index in bus.subsystems){
                let subsystem = subSystems_map.get(bus.subsystems[subsystem_index].id) 
                for (slave_index in subsystem.slaves){
                    if (subsystem.slaves[slave_index].irq_conn != undefined){
                        if (subsystem.slaves[slave_index].irq_conn.master_id == master_id)
                            module_assignments += `\tassign M${master_id}_IRQ[${subsystem.slaves[slave_index].irq_conn.line}] = IRQ_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}};\n`
                    }
                }
            }
        }

    }

}

function real_masters_instantiation(masters_map, address_space){
    
	for (bus_index in soc.buses){


    	for (master_index in soc.buses[bus_index].masters){
            let master_id = soc.buses[bus_index].masters[master_index];
            let mID = master_id.split("_")[0];
            var master_data
            for (master_idx in soc.masters){
                if (soc.masters[master_idx].id == mID){
                    master_data = masters[mID]
                }
            }

	    	if(masters_map.has(master_id)){
	    		let arr = masters_map.get(master_id)
	    		arr.push(soc.buses[bus_index])
	    		masters_map.set(master_id, arr)
	    	} else {
                masters_map.set(master_id, [master_data, [soc.buses[bus_index]]])
                // copying files
                if(masters[master_id] != undefined){         
                    for (i in masters[master_id].files){
                        let file = masters[master_id].files[i]
                        
                        var n = file.lastIndexOf('/');
                        var filename = file.substring(n + 1);  
                        try{   
                            var module = fs.readFileSync("./masters/"+file)
                        }catch(e){
                            throw new Error("master file doesn't exist " + filename)
                        }
                        
                        fs.writeFile(Directory+filename, module, (err) => {
                            if (err)
                                throw err; 
                            })
                    }
                }
            }
	    }
    }


    for (master_idx in soc.masters){
        let master_id = soc.masters[master_idx].id
        module_declarations+=`\n\t// AHB LITE Master${master_id} Signals`
        module_content += `\n\t// Instantiation of ${masters_map.get(master_id)[0].module_name}`
        module_content += `\n\t${masters_map.get(master_id)[0].module_name} ${masters_map.get(master_id)[0].name}(`

        if (masters_map.get(master_id)[0].bus_clock != undefined){
            module_content += `\n\t\t.${masters_map.get(master_id)[0].bus_clock.name}(HCLK),`
        }
        if (masters_map.get(master_id)[0].bus_reset != undefined){
            module_content += `\n\t\t.${masters_map.get(master_id)[0].bus_reset.name}`
            if (masters_map.get(master_id)[0].bus_reset.trig_level == 0)
                module_content += `(HRESETn),`
            else 
                module_content += `(~HRESETn),`
        }

        if (masters_map.get(master_id)[0].bus_interface != undefined){
            for (signal_idx in masters_map.get(master_id)[0].bus_interface){
                signal = masters_map.get(master_id)[0].bus_interface[signal_idx]

                // bus_connection is not a number and not null
                if ((isNaN(signal.bus_connection) == true) & (signal.bus_connection != null)){

                    if(isNaN(signal.size) == false){
                        module_declarations += `\n\twire [${signal.size - 1}:0] M${master_id}_${signal.bus_connection};`
                    } 
                    else if (signal.size = "address_size"){
                        module_declarations += `\n\twire [${address_space - 1}:0] M${master_id}_${signal.bus_connection};`
                    }

                    module_content += `\n\t\t.${signal.master_port}(M${master_id}_${signal.bus_connection}),`
                } 
                // bus_connection is a number
                else if ((isNaN(signal.bus_connection) == false) & (signal.bus_connection != null)){

                    if(isNaN(signal.size) == false){
                        module_declarations += `\n\twire [${signal.size - 1}:0] M${master_id}_${signal.master_port};`
                    } else if (signal.size = "address_size"){
                        module_declarations += `\n\twire [${address_space - 1}:0] M${master_id}_${signal.master_port};`
                    }

                    module_assignments += `\n\tassign M${master_id}_${signal.master_port} = ${signal.size}'h${signal.bus_connection};`
                    module_content += `\n\t\t.${signal.master_port}(M${master_id}_${signal.master_port}),`
                } 
                // bus_connection is null
                else if (signal.bus_connection == null){
                    module_content += `\n\t\t.${signal.master_port}(),`
                }
            }
        }
        module_declarations += `\n`

        if(masters[master_id].interrupts != undefined){
            module_content += `\n\n\t\t//Interrupts`
            for (int_idx in masters[master_id].interrupts){
                let int = masters[master_id].interrupts[int_idx];
                module_content += `\n\t\t.${int.name}(`
                if (int.default_connection == undefined)
                    module_content += `),`
                else if ((isNaN(int.default_connection) == false) || (int.default_connection == "HCLK") || (int.default_connection == "HRESETn")) 
                    module_content += `${int.default_connection}),`
                else 
                    module_content += `M${master_id}_${int.default_connection}),`
            }
        } 
        interrupt_line_connection(master_id, soc.masters[master_idx])

        if(masters[master_id].ports != undefined){
            module_content += `\n\n\t\t//Ports`
            for (port_idx in masters[master_id].ports){
                let port = masters[master_id].ports[port_idx];
                module_content += `\n\t\t.${port.name}(`
                if (port.default_connection == undefined)
                    module_content += `),`
                else if ((isNaN(port.default_connection) == false) || (port.default_connection == "HCLK") || (port.default_connection == "HRESETn")) 
                    module_content += `${port.default_connection}),`
                else 
                    module_content += `M${master_id}_${port.default_connection}),`
            }
        } 
        if (module_content[module_content.length-1] == ",")
            module_content = module_content.slice(0, -1);
        module_content += `);`
    }
}

function ahb_sys_gen(IPs_map,subSystems_map, bus, address_space, page_bits){
  //AHB Sys Generation
  var prefix = "AHB_sys_"+bus.id.toString()
  createDir(Directory+prefix+"/")  
  ahb_sys_generator.ahb_sys_gen(IPs_map, subSystems_map,bus, address_space, page_bits,Directory+prefix+"/");
  module_declarations+=`
\t// wire HCLK_Sys${bus.id};
\t// wire HRESETn_Sys${bus.id};

\twire [${soc.address_space-1}: 0] HADDR_Sys${bus.id};
\twire [31: 0] HWDATA_Sys${bus.id};
\twire HWRITE_Sys${bus.id};
\twire [1: 0] HTRANS_Sys${bus.id};
\twire [2:0] HSIZE_Sys${bus.id};

\twire HREADY_Sys${bus.id};
\twire [31: 0] HRDATA_Sys${bus.id};
`

    var slaves = bus.slaves; 
    for(var slave_index in slaves){
        if (IPs_map.get(slaves[slave_index].type).irqs != undefined){
            if (IPs_map.get(slaves[slave_index].type).irqs.length > 0)
            {
                module_declarations += `\n\twire IRQ_Sys${soc.buses[bus_index].id}_S${slave_index};`
            }
        }
    }

    var subSystems = bus.subsystems;
    for (var subSystem_index in subSystems){ 
        var subSystem = subSystems_map.get(subSystems[subSystem_index].id)
        for(var slave_index in subSystem.slaves){
            if (IPs_map.get(subSystem.slaves[slave_index].type).irqs != undefined){
                if (IPs_map.get(subSystem.slaves[slave_index].type).irqs.length > 0)
                {
                module_declarations += `\n\twire IRQ_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index};`
                }
            }
        }
    }


    if (bus.masters.length > 1){
        module += `\n\twire [3:0] HMASTER_Sys${bus.id};\n\twire [3:0] HPROT_Sys${bus.id};\n\twire [2:0] HBURST_Sys${bus.id};\n`

        for (var master_index in bus.masters)
        module_declarations += `\n\n\twire M${bus.masters[master_index]}_HGRANT_Sys${bus.id};`
    }
  //Arbiter Generation
  if(arbiter_gen(bus)){
    //logic for connecting arbiter to bus and masters to arbiter
    ahb_arbiter_instantiation(bus)
    ahb_masters_mul_instantiation(bus)
  } 
  else {
    master_id = bus.masters[0]
    module_assignments += `
\twire [3:0] M${master_id}_HPROT;
\twire [2:0] M${master_id}_HBURST;
\twire M${master_id}_HBUSREQ;
\twire M${master_id}_HLOCK;
\twire M${master_id}_HGRANT;
\tassign M${master_id}_HREADY = HREADY_Sys${bus.id}; 
\tassign M${master_id}_HRDATA = HRDATA_Sys${bus.id};\n
\tassign HADDR_Sys${bus.id} = M${master_id}_HADDR; 
\tassign HWDATA_Sys${bus.id} = M${master_id}_HWDATA; 
\tassign HWRITE_Sys${bus.id} = M${master_id}_HWRITE; 
\tassign HTRANS_Sys${bus.id} = M${master_id}_HTRANS; 
\tassign HSIZE_Sys${bus.id} = M${master_id}_HSIZE;
\tassign M${master_id}_HGRANT = 1'b1;
\tassign M${master_id}_HBUSREQ = 1'b1;\n\n` 
  }
    
  ahb_sys_instantiation(IPs_map,subSystems_map,bus)
}

function ahb_arbiter_instantiation(bus){
    module_content += ahb_arbiter_generator.ahb_arbiter_instantiation(bus)
}

function ahb_masters_mul_instantiation(bus){
    module_content += ahb_masters_mul_generator.ahb_masters_mul_instantiation(bus)
}

function ahb_sys_instantiation(IPs_map,subSystems_map,bus){
  //Instantiation
  module_content += ahb_sys_generator.ahb_sys_instantiation(soc, IPs_map,subSystems_map,bus)
}

function digital_modules_instantiation_AHB(IPs_map,slaves,slave_index, busID){
    var line = ``

    if(IPs_map.get(slaves[slave_index].type) == undefined){
        fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
  
            // In case of a error throw err. 
            if (err) throw err; 
        }) 
    }
    if(IPs_map.get(slaves[slave_index].type) != undefined){
        line += `
        //Digital module # ${slave_index}
        ` + IPs_map.get(slaves[slave_index].type).name
        

        var IP = IPs_map.get(slaves[slave_index].type)

        if(IP.params != undefined){
            line+=` #(` 
            for(var param_idx in IP.params){
                var param = IP.params[param_idx]
                
                line += param.name+" = " + toString(utils.getParamValue(IP,slaves[slave_index],param.name))+` ,`
             }
            if(line[line.length-1] == ',')
                line = line.slice(0, -1);
            line+=`)`
         }
         line+= ` Sys${busID}_S${slave_index} (`
      
        if (IP.bus_clock != undefined){
            line += `
            .${IP.bus_clock.name}(HCLK),`
        } 
        if (IP.bus_reset != undefined){
            if (IP.bus_reset.trig_level == 0){
                line += `
                .${IP.bus_reset.name}(HRESETn),`
            } else if (IP.bus_reset.trig_level == 1){
                line += `
                .${IP.bus_reset.name}(~HRESETn),`
            }
        }
        if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
            if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                    var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                    if (reg.fields != undefined){
                        for (var i = 0; i < reg.fields.length; i++){
                            line += `\n\t\t\t.${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_Sys${busID}_S${slave_index}),`//Suspecting a BUG here
                        }
                    } else {
                        line += `\n\t\t\t.${reg.port}(${reg.port}_Sys${busID}_S${slave_index}),`
                    }
                    if(reg.access_pulse != undefined){
                        line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_Sys${busID}_S${slave_index}),`
                    }
                }
            }
        }else{ //NON-GENERIC SOFT MODULES CONNECTED TO AHB
            if(IPs_map.get(slaves[slave_index].type).interface_type != "AHB") throw new Error("IP type "+slaves[slave_index].type+" is not generic and doesn't have an AHB interface")
            
            var tmpSlaveInterface = IPs_map.get(slaves[slave_index].type).busInterface
    
            if(tmpSlaveInterface.HSEL != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HSEL}(HSEL_Sys${busID}_S${slave_index}),`
            if(tmpSlaveInterface.HADDR != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HADDR}(HADDR_Sys${busID}),`
            if(tmpSlaveInterface.HREADY != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HREADY}(HREADY_Sys${busID}),`
            if(tmpSlaveInterface.HWRITE != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HWRITE}(HWRITE_Sys${busID}),`
            if(tmpSlaveInterface.HTRANS != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HTRANS}(HTRANS_Sys${busID}),`
            if(tmpSlaveInterface.HSIZE != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HSIZE}(HSIZE_Sys${busID}),`
            if(tmpSlaveInterface.HWDATA != null)
              line += `\n\t\t\t.${tmpSlaveInterface.HWDATA}(HWDATA_Sys${busID}),`
            if(tmpSlaveInterface.HRDATA != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HRDATA}(HRDATA_Sys${busID}_S${slave_index}),`
            if(tmpSlaveInterface.HREADYOUT != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HREADYOUT}(HREADY_Sys${busID}_S${slave_index}),`
            if(tmpSlaveInterface.HRESP != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HRESP}(HRESP_Sys${busID}),`
        }

            for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                line += `\n\t\t\t.${external.port}(${external.port}_Sys${busID}_S${slave_index}),`
            }

        if(line[line.length-1] == ',')
            line = line.slice(0, -1);

        line += `
            );
            `
        return line
    }
}

function digital_modules_instantiation_APB(slaves, slave_index, IPs_map, busID, subSystemID){
    var line = ``

    if(IPs_map.get(slaves[slave_index].type) == undefined){
        fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
  
            // In case of a error throw err. 
            if (err) throw err; 
        }) 
    }
    if(IPs_map.get(slaves[slave_index].type) != undefined)
    line += `
        //Digital module # ${slave_index}
        ` + IPs_map.get(slaves[slave_index].type).name + ` declarations${slave_index} (`

    var IP = IPs_map.get(slaves[slave_index].type)
    
    if(IP.params != undefined){
        line+=` #(` 
        for(var param_idx in IP.params){
            var param = IP.params[param_idx]
                
            line += param.name+" = " + toString(utils.getParamValue(IP,slaves[slave_index],param.name))+` ,`
            }
        if(line[line.length-1] == ',')
            line = line.slice(0, -1);
        line+=`)`
    }
    
    line += ` declarations${slave_index} (`

    if (IP.bus_clock != undefined){
        line += `
        .${IP.bus_clock.name}(PCLK_Sys${busID}_SS${subSystemID}),`
    } 
    if (IP.bus_reset != undefined){
        if (IP.bus_reset.trig_level == 0){
            line += `
            .${IP.bus_reset.name}(PRESETn_Sys${busID}_SS${subSystemID}),`
        } else if (IP.bus_reset.trig_level == 1){
            line += `
            .${IP.bus_reset.name}(~PRESETn_Sys${busID}_SS${subSystemID}),`
        }
    }

    if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
        if (IPs_map.get(slaves[slave_index].type).regs != undefined){
            for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                
                if (reg.fields != undefined){
                    for (var i = 0; i < reg.fields.length; i++){
                        line += `\n\t\t\t.${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_Sys${busID}_SS${subSystemID}_S${slave_index}),`
                    }
                } else {
                    line += `\n\t\t\t.${reg.port}(${reg.port}_Sys${busID}_SS${subSystemID}_S${slave_index}),`
                }

                if(reg.access_pulse != undefined){
                    line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_Sys${busID}_SS${subSystemID}_S${slave_index}),`
                }
            }
        }
    }else{//NON-GENERIC SOFT MODULES CONNECTED TO APB
        if(IPs_map.get(slaves[slave_index].type).interface_type != "APB") throw new Error("IP type "+ slaves[slave_index].type +" is not generic and doesn't have an APB interface")
        
        var tmpSlaveInterface = IPs_map.get(slaves[slave_index].type).busInterface

        if(tmpSlaveInterface.PSEL != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PSEL}(PSEL_Sys${busID}_SS${subSystemID}_S${slave_index}),`
        if(tmpSlaveInterface.PADDR != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PADDR}(PADDR_Sys${busID}_SS${subSystemID}),`
        if(tmpSlaveInterface.PREADY != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PREADY}(PREADY_Sys${busID}_SS${subSystemID}_S${slave_index}),`
        if(tmpSlaveInterface.PWRITE != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PWRITE}(PWRITE_Sys${busID}_SS${subSystemID}),`
        if(tmpSlaveInterface.PWDATA != null)
          line += `\n\t\t\t.${tmpSlaveInterface.PWDATA}(PWDATA_Sys${busID}_SS${subSystemID}),`
        if(tmpSlaveInterface.PRDATA != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PRDATA}(PRDATA_Sys${busID}_SS${subSystemID}_S${slave_index}),`
        if(tmpSlaveInterface.PENABLE != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PENABLE}(PENABLE_Sys${busID}_SS${subSystemID}),`
            
    }

    for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
        var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
        line += `   
            .${external.port}(${external.port}_Sys${busID}_SS${subSystemID}_S${slave_index}),`
    }

    if(line[line.length-1] == ',')
            line = line.slice(0, -1);

    line += `
        );
        `
    return line
}

function form_testbench(){
    if(soc.testbench != undefined){
        testbench += `\`timescale 1ns/1ns\nmodule tb;`

        // declarations
        testbench +=
`\n\treg HCLK; 
\treg HRESETn;
\treg [7: 0] Input_DATA;
\treg [0: 0] Input_irq;
\twire Output_DATA`

        // top level instantiation
        testbench_inst_beginning =
`\n\n\tsoc_m${soc.masters.length}_b${soc.buses.length} uut(
\t\t.HCLK(HCLK), 
\t\t.HRESETn(HRESETn),
\t\t.Input_DATA(Input_DATA),
\t\t.Input_irq(Input_irq),
\t\t.Output_DATA(Output_DATA),`

        // top level externals for 
        testbench += testbench_header + ";"
        
        // top level externals for instantiation
        testbench_inst = testbench_inst_beginning + testbench_inst
        if(testbench_inst[testbench_inst.length-1] == ",")
            testbench_inst = testbench_inst.slice(0, -1);
        
        testbench += testbench_inst + `);\n`
        
    
        // testbench body
        testbench += `\n\talways #5 HCLK = ~HCLK;
\tinitial begin
\t\tHCLK = 0;
\t\tHRESETn = 1'bx;

\t\t#50;
\t\tHRESETn = 0;
\t\t#100;
\t\tHRESETn = 1;
\tend
\tinitial begin`
        if (soc.testbench.vcd != undefined)
            testbench += `\n\t\t$dumpfile("${soc.testbench.vcd}");`
        else 
            testbench += `\n\t\t$dumpfile("dump");`
        
        testbench +=`\n\t\t$dumpvars(0);`

        if (soc.testbench.ticks != undefined)
            testbench += `\n\t\t#${soc.testbench.ticks};`
        else 
            testbench += `\n\t\t#1000;`

        testbench += `\n\t\t$finish;\n\tend`

        for (bus_idx in soc.buses){
            testbench += `\n\talways @(db_reg_Sys${soc.buses[bus_idx].id}) begin
\t\tif (db_reg_Sys${soc.buses[bus_idx].id} == 4'ha) begin
\t\t\t$display("Test Passed");
\t\t\t$finish;
\t\tend
\t\telse if (db_reg_Sys${soc.buses[bus_idx].id} == 4'hf) begin 
\t\t\t$display("Test failed");
\t\t\t$finish;
\t\tend
\tend`
        }
        

        if (soc.testbench.hex_file != undefined && soc.testbench.load_into != undefined){
            testbench += `
\tinitial begin 
\t\t#1  
\t\t$readmemh("${soc.testbench.hex_file}", ${soc.testbench.load_into}); 
\tend`
        }
        testbench += testbenchs
        testbench += testbenchContent

        testbench += `\n\nendmodule`
        
        fs.writeFile(Directory+"soc_m"+soc.masters.length+"_b"+soc.buses.length+"_tb.v", testbench, (err) => {
            if (err)
                throw err; 
        })
    }
}

function external_conections(IPs_map){
    for (bus_index in soc.buses){
        var slaves = soc.buses[bus_index].slaves
        for (var slave_index in slaves){
            if(IPs_map.get(slaves[slave_index].type).connected_to != undefined){
                connection = IPs_map.get(slaves[slave_index].type).connected_to;

                if (slaves[slave_index].connected_to != undefined){
                    if (IPs_map.get(slaves[slave_index].type).connected_to.placement == "soc_core")
                        continue;
                    var content = ''
                    var content_PAD = ``
                    var declarations = ''
                    var wires = ''
                    conn_idx = slaves[slave_index].connected_to
                    if (connection[conn_idx] != undefined){

                        if (connection[conn_idx].files != undefined){
                            for (i in connection[conn_idx].files){
                                let file = connection[conn_idx].files[i]
                                try{   
                                    var module = fs.readFileSync("./IPs/"+file)
                                }catch(e){
                                    throw new Error("external file doesn't exist " + filename)
                                }
        
                                var n = file.lastIndexOf('/');
                                var filename = file.substring(n + 1);  
        
                                fs.writeFile(Directory+filename, module, (err) => {
                                    if (err)
                                        throw err; 
                                  })
                            }
                        }

                        if(connection[conn_idx].required_lines != undefined){
                            for (line_idx in connection[conn_idx].required_lines){
                                req_line_obj = connection[conn_idx].required_lines[line_idx]
                                req_line = connection[conn_idx].required_lines[line_idx].line;
                                for(signal_idx in req_line_obj.signals){
                                    var re = new RegExp(req_line_obj.signals[signal_idx]+ " ");
                                    req_line = req_line.replace( re , req_line_obj.signals[signal_idx] +`_Sys${bus_index}_S${slave_index} `)
                                }
                                declarations += "\n\n\t" + req_line
                            }
                        }


                        if (connection[conn_idx].inst_name == undefined)
                            content += `\n\t${connection[conn_idx].name} ${connection[conn_idx].name}_Sys${bus_index}_S${slave_index}(`
                        else 
                            content += `\n\t${connection[conn_idx].name} ${connection[conn_idx].inst_name}(`

                        if(connection[conn_idx].bus_clock != undefined)
                            content += `\n\t.${connection[conn_idx].bus_clock.name}(HCLK),`

                        if(connection[conn_idx].bus_reset != undefined){
                            content += `\n\t.${connection[conn_idx].bus_reset.name}`
                            if (connection[conn_idx].bus_reset.trig_level == 0)
                                content += `(HRESETn),`
                            else
                                content += `(~HRESETn),`
                        }

                        content_PAD = content
                        for(port_idx in connection[conn_idx].ports){
                            port = connection[conn_idx].ports[port_idx]
                            if (port.conn != undefined)
                                if (port.conn == "db_reg"){
                                    content += `\n\t.${port.name}(${port.conn}_Sys${bus_index}),`
                                    content_PAD += `\n\t.${port.name}(${port.conn}_Sys${bus_index}),`
                                }
                                else {
                                    content += `\n\t.${port.name}(${port.conn}_Sys${bus_index}_S${slave_index}),`
                                    content_PAD += `\n\t.${port.name}(PAD_${port.conn}_Sys${bus_index}_S${slave_index}),`
                                }
                                
                            if (port.conn_created != undefined){
                                content += `\n\t.${port.name}(${port.conn_created}),`
                                content_PAD += `\n\t.${port.name}(${port.conn_created}),`
                            }
                        }
                        content = content.slice(0, -1);
                        content += `\n\t);`

                        content_PAD = content_PAD.slice(0, -1);
                        content_PAD += `\n\t);`
                    }
                    if (connection[conn_idx].placement == "soc"){
                        topModules += declarations
                        topModuleContent += content
                    } 
                    else if (connection[conn_idx].placement == "testbench"){
                        testbenchs += declarations
                        testbenchContent += content
                    }
                    else if (connection[conn_idx].placement == "soc_core"){
                        module_declarations += declarations
                        module_content += content
                    }
                }
            }

        }
        var subSystems = soc.buses[bus_index].subsystems
        for (var subSystem_index in subSystems){
            for (var slave_index in subSystems_map.get(subSystems[subSystem_index].id).slaves){
                slave = subSystems_map.get(subSystems[subSystem_index].id).slaves[slave_index]
                if(IPs_map.get(slave.type).connected_to != undefined){
                    // if (IPs_map.get(slave.type).connected_to.placement == "soc_core")
                    //     continue;
                    var content = ``
                    var content_PAD = ``
                    var declarations = ``
                    connection = IPs_map.get(slave.type).connected_to;
    
                    if (slave.connected_to != undefined){
                        conn_idx = slave.connected_to
                        if (connection[conn_idx] != undefined){

                            if (connection[conn_idx].files != undefined){
                                for (i in connection[conn_idx].files){
                                    let file = connection[conn_idx].files[i]
                                    try{   
                                        var module = fs.readFileSync("./IPs/"+file)
                                    }catch(e){
                                        throw new Error("external file doesn't exist")
                                    }
            
                                    var n = file.lastIndexOf('/');
                                    var filename = file.substring(n + 1);  
            
                                    fs.writeFile(Directory+filename, module, (err) => {
                                        if (err)
                                            throw err; 
                                      })
                                }
                            }    
    
                            if(connection[conn_idx].required_lines != undefined){
                                for (line_idx in connection[conn_idx].required_lines){
                                    req_line_obj = connection[conn_idx].required_lines[line_idx]
                                    req_line = connection[conn_idx].required_lines[line_idx].line;
                                    for(signal_idx in req_line_obj.signals){
                                        var re = new RegExp(req_line_obj.signals[signal_idx]+ " ");
                                        req_line = req_line.replace( re , req_line_obj.signals[signal_idx] +`_Sys${bus_index}_SS${subSystem_index}_S${slave_index} `)
                                    }
                                    declarations += "\n\n\t" + req_line
                                }
                            }
    
    
                            if (connection[conn_idx].inst_name == undefined)
                                content += `\n\t${connection[conn_idx].name} ${connection[conn_idx].name}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}(`
                            else 
                                content += `\n\t${connection[conn_idx].name} ${connection[conn_idx].inst_name}(`
    
                            if(connection[conn_idx].bus_clock != undefined)
                                content += `\n\t.${connection[conn_idx].bus_clock.name}(HCLK),`
    
                            if(connection[conn_idx].bus_reset != undefined){
                                content += `\n\t.${connection[conn_idx].bus_reset.name}`
                                if (connection[conn_idx].bus_reset.trig_level == 0)
                                    content += `(HRESETn),`
                                else
                                    content += `(~HRESETn),`
                            }
                            
                            content_PAD = content
                            for(port_idx in connection[conn_idx].ports){
                                port = connection[conn_idx].ports[port_idx]

                                if (port.conn != undefined)
                                    if (port.conn == "db_reg"){
                                        content += `\n\t.${port.name}(${port.conn}_Sys${bus_index}),`
                                        content_PAD += `\n\t.${port.name}(${port.conn}_Sys${bus_index}),`
                                    }
                                    else {
                                        content += `\n\t.${port.name}(${port.conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}),`
                                        content_PAD += `\n\t.${port.name}(PAD_${port.conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}),`
                                    }
                                    
                                if (port.conn_created != undefined){
                                    content += `\n\t.${port.name}(${port.conn_created}),`
                                    content_PAD += `\n\t.${port.name}(${port.conn_created}),`
                                }
                            }
                            content = content.slice(0, -1);
                            content += `\n\t);`

                            content_PAD = content_PAD.slice(0, -1);
                            content_PAD += `\n\t);`
                        }
                    }
                    if (connection[conn_idx].placement == "soc"){
                        topModules += declarations
                        topModuleContent += content
                    } 
                    else if (connection[conn_idx].placement == "testbench"){
                        testbenchs += declarations
                        testbenchContent += content
                    } else if (connection[conn_idx].placement == "soc_core"){
                        module_declarations += declarations
                        module_content += content
                    }
                }
            }
        }
    }
}
function IOsInstantiation(IPs_map){
    var IOs_json = fs.readFileSync("./IOs/IOs.json")
    IOs_arr = JSON.parse(IOs_json)
    for (j in IOs_arr){
        let files = IOs_arr[j].files
        for (i in files){
            let file = files[i]
            try{   
                var module = fs.readFileSync("./IOs/"+file)
            }catch(e){
                throw new Error("I/O file doesn't exist "  + files)
            }
            var n = file.lastIndexOf('/');
            var filename = file.substring(n + 1);  
            fs.writeFile(Directory+filename, module, (err) => {
                if (err)
                    throw err; 
              })
        }
    }
    
    
    for (bus_index in soc.buses){
        var slaves = soc.buses[bus_index].slaves
        for (var slave_index in slaves){
            if(IPs_map.get(slaves[slave_index].type).IOs != undefined){
                for (IO_indx in IPs_map.get(slaves[slave_index].type).IOs){
                    IO = IPs_map.get(slaves[slave_index].type).IOs[IO_indx]
                    IP = IPs_map.get(slaves[slave_index].type)
                    let IO_entry = IOs_arr.find(fruit => fruit.name === IO.name);
                    let external = IP.externals.find(fruit => fruit.name === IO.ports[0].conn);
                    if (external == undefined)
                      continue;
                    size = external.size;
            
                    //create PADs
                    for (i = 0; i < IO.ports.length; i++){
                        if (isNaN(IO.ports[i].conn) == true){
                            topModuleContent += `\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index};`
                            if (IO.ports[i].type == "PAD"){
                                let IO_PAD = IO_entry.ports.find(fruit => fruit.name === IO.ports[i].name)
                                let IP_PU = IO.ports.find(fruit => fruit.type === "PU")
                                if (IO_PAD.access == 1){
                                    topModuleHeader += `,\n\tinput [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`
                                    testbench_header += `;\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`
                                    testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}),`
                                }
                                else if (IO_PAD.access == 0){
                                    topModuleHeader += `,\n\toutput[${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`
                                    testbench_header += `;\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`
                                    testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}),`
                                } else if (IO_PAD.access == 2){
                                    topModuleHeader += `,\n\tinout[${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`
                                    if (IP_PU != undefined && IP_PU.conn == 1)
                                        testbench_header += `;\n\ttri1 [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`    
                                    else 
                                        testbench_header += `;\n\ttri [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}`                       
                                    testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_S${slave_index}),`
                                }
                                
                            }
                        }
                    }
                    for (i = 0; i < size; i++){
                        // instanitaion
                        topModuleContent += `\n\t${IO_entry.name} ${IO_entry.name}_Sys${bus_index}_S${slave_index}_IO${IO_indx}_${i}(`
                        for (j = 0; j < IO.ports.length; j++){
                            if (isNaN (IO.ports[j].conn) == false)
                                topModuleContent += ` .${IO.ports[j].name}(1'b${IO.ports[j].conn}),` 
                            else{
                                topModuleContent += ` .${IO.ports[j].name}(`
                                if (IO.ports[j].inverted == 1)
                                    topModuleContent += `~`
                                topModuleContent += `${IO.ports[j].conn}_Sys${bus_index}_S${slave_index}`
                                if (size > 1)
                                    topModuleContent +=`[${i}]),`
                                else 
                                    topModuleContent += `),`
                            }
                        }
                        topModuleContent = topModuleContent.slice(0, -1);
                        topModuleContent += `);`
                    }
                }
            }
        }

        var subSystems = soc.buses[bus_index].subsystems
        for (var subSystem_index in subSystems){
            for (var slave_index in subSystems_map.get(subSystems[subSystem_index].id).slaves){
                slave = subSystems_map.get(subSystems[subSystem_index].id).slaves[slave_index]
                if(IPs_map.get(slave.type).IOs != undefined){
                    for (IO_indx in IPs_map.get(slave.type).IOs){
                        IO = IPs_map.get(slave.type).IOs[IO_indx]
                        IP = IPs_map.get(slave.type)
                        let IO_entry = IOs_arr.find(fruit => fruit.name === IO.name);
                        let external = IP.externals.find(fruit => fruit.name === IO.ports[0].conn);
                        if (external == undefined)
                          continue;
                        size = external.size;
                
                        //create PADs
                        for (i = 0; i < IO.ports.length; i++){
                            if (isNaN(IO.ports[i].conn) == true){
                                topModuleContent += `\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_S${slave_index};`
                                if (IO.ports[i].type == "PAD"){
                                    let IO_PAD = IO_entry.ports.find(fruit => fruit.name === IO.ports[i].name)
                                    if (IO_PAD.access == 1){
                                        topModuleHeader += `,\n\tinput [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_header += `;\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}),`
                                    }
                                    else if (IO_PAD.access == 0){
                                        topModuleHeader += `,\n\toutput[${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_header += `;\n\twire [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}),`
                                    } else if (IO_PAD.access == 2){
                                        topModuleHeader += `,\n\tinout[${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_header += `;\n\ttri1 [${size-1}:0] ${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        testbench_inst += `\n\t\t.${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}(${IO.ports[i].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}),`
                                    }
                                    
                                }
                            }
                        }
                        // testbench_inst = testbench_inst.slice(0,-1);
                        for (i = 0; i < size; i++){
                            // instanitaion
                            topModuleContent += `\n\t${IO_entry.name} ${IO_entry.name}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}_IO${IO_indx}_${i}(`
                            for (j = 0; j < IO.ports.length; j++){
                                if (isNaN (IO.ports[j].conn) == false)
                                    topModuleContent += ` .${IO.ports[j].name}(1'b${IO.ports[j].conn}),` 
                                else{
                                        topModuleContent += ` .${IO.ports[j].name}(`
                                        if (IO.ports[j].inverted == 1)
                                            topModuleContent += `~`
                                        topModuleContent += `${IO.ports[j].conn}_Sys${bus_index}_SS${subSystem_index}_S${slave_index}`
                                        if (size > 1)
                                            topModuleContent +=`[${i}]),`
                                        else 
                                            topModuleContent += `),`
                                }
                            }
                            topModuleContent = topModuleContent.slice(0, -1);
                            topModuleContent += `);`
                        }
                    }
                }
            }
        }
    }

}

