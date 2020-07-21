/*
This file automatically generates a verilog module for the AHB System, the slaves' wrappers,
the AHB bus, a dummy master and the AHB System tb. 
*/
'use strict';

//dependencies
let wrapper = require("../wrapper.js");
let ahb_bus_generator = require("./ahblite_bus_gen.js");
let ahb_sys_tb_generator = require("./ahblite_tb_gen.js");
let apb_sys_generator = require("../APB/apb_sys_gen.js")
let utils = require("../utils/utils.js")

const IRQEN_OFF = "40";

const fs = require('fs');
var codePathArr = process.argv[1].split("/")

if(codePathArr[codePathArr.length-1] == "ahblite_sys_gen.js"){
    
    if(process.argv.length<4){
        console.log("use: node ahblite_sys_gen.js soc.json ip.json subsystems_JSON\n");
    }
    var Directory = `../Output/`;
    try{
        fs.mkdirSync(Directory, { recursive: true })
    }catch(e){
        
    }

    let soc_json = fs.readFileSync(process.argv[2]);
    let rawdata =  fs.readFileSync(process.argv[3]);
    var ip = JSON.parse(rawdata)
    let soc = JSON.parse(soc_json);
    var slaves = soc.buses[0].slaves
    var IPs_map = new Map();
    //create map for IPs
    for (var slave_index in slaves){
        var type = slaves[slave_index].type
        if (type < ip.length)
            IPs_map.set(type, ip[type])
    }
    var subSystems_map = new Map();
    for (var subSystem_index in subSystems){    
        var i = parseInt(4) + parseInt(subSystem_index)
        
        var sub_soc_json = fs.readFileSync(process.argv[i]);
        
        var subSystem = JSON.parse(sub_soc_json)
        
        var id = subSystem.id
        subSystems_map.set(id, [subSystems[subSystem_index].page ,subSystem])
    }
    //Adding sub-systems IPs
    for(var subSystem_index in subSystems){
        for (var slave_index in subSystems_map.get(subSystems[subSystem_index].id)[1].slaves){
        var type = subSystems_map.get(subSystems[subSystem_index].id)[1].slaves[slave_index].type
        if (type < ip.length)
            IPs_map.set(type, ip[type])
        }
    }
    ahb_sys(IPs_map, subSystems_map,soc.buses[0],soc.address_space,soc.page_bits,Directory)


}

function createDir(Directory){
    try{
        fs.mkdirSync(Directory, { recursive: true })
    }catch(e){
        
    }
}
module.exports={
    ahb_sys_gen : function (IPs_map, subSystems_map,soc, address_space, page_bits, Directory){
        ahb_sys(IPs_map, subSystems_map, soc, address_space, page_bits, Directory)
    }, 

    ahb_sys_instantiation(soc, IPs_map,subSystems_map,bus){
        var busSignalsOut = false;
        let module_content =`
\t//AHBlite_SYS${bus.id} instantiation

\tAHBlite_sys_${bus.id} ahb_sys_${bus.id}_uut(
\t\t// .HCLK(HCLK_Sys${bus.id}),
\t\t// .HRESETn(HRESETn_Sys${bus.id}),
    
\t\t.HCLK(HCLK),
\t\t.HRESETn(HRESETn),
         
\t\t.HADDR(HADDR_Sys${bus.id}),
\t\t.HWDATA(HWDATA_Sys${bus.id}),
\t\t.HWRITE(HWRITE_Sys${bus.id}),
\t\t.HTRANS(HTRANS_Sys${bus.id}),
\t\t.HSIZE(HSIZE_Sys${bus.id}),
    
\t\t.HREADY(HREADY_Sys${bus.id}),
\t\t.HRDATA(HRDATA_Sys${bus.id}),
    
\t\t.Input_DATA(Input_DATA),
\t\t.Input_irq(Input_irq),
\t\t.Output_DATA(Output_DATA)`

    var slaves = bus.slaves;
    var subSystems = bus.subsystems;
        //External Signals Connection
        for(var slave_index in slaves){
            if(IPs_map.get(slaves[slave_index].type) == undefined){
                fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
                    // In case of a error throw err. 
                    if (err) throw err; 
                }) 
            }
            if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
                for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                    var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                    module_content += `,\n\t\t.${external.port}_S${slave_index}(${external.port}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                }
            }else{
                //Getting system's hard modules signals out of the module
                if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){//Hard Generic module
                    if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                        for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                            var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                            if (reg.fields != undefined){
                                for (var i = 0; i < reg.fields.length; i++){
                                    module_content += `,\n\t\t.${reg.port}_${reg.fields[i].name}_S${slave_index}(${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                                }
                            } else {
                                module_content += `,\n\t\t.${reg.port}_S${slave_index}(${reg.port}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                            }
                            if(reg.access_pulse != undefined){
                                module_content += `,\n\t\t.${reg.access_pulse}_S${slave_index}(${reg.access_pulse}_Sys${soc.buses[bus_index].id}_S${slave_index})`
                            }
                        }
                    }
                }else{//Hard Non-Generic Modules, Expose Bus Signals once
                    if(IPs_map.get(slaves[slave_index].type).interface_type != "AHB") throw new Error("IP type "+toString(slaves[slave_index].type)+" is not generic and doesn't have an AHB interface")
                    
                    if(busSignalsOut == false){
                    
                        module_content+=`,\n\t\t.HRESP(HRESP_Sys${soc.buses[bus_index].id})`
                        busSignalsOut = true;
                    }
                    module_content += `,\n\t\t.HSEL_S${slave_index}(HSEL_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    module_content += `\n\t\t.HRDATA_S${slave_index}(HRDATA_Sys${soc.buses[bus_index].id}_S${slave_index}),`
                    module_content += `\n\t\t.HREADY_S${slave_index}(HREADY_Sys${soc.buses[bus_index].id}_S${slave_index})`
                    

                }
            
                if (IPs_map.get(slaves[slave_index].type).irqs != undefined){
                    if (IPs_map.get(slaves[slave_index].type).irqs.length > 0)
                    {
                    module_content += `,\n\t\t.IRQ_S${slave_index}(IRQ_Sys${soc.buses[bus_index].id}_S${slave_index})`
                    }
                } 
            } 
            if (slaves[slave_index].type == 9)
                if (IPs_map.get(9) != undefined)
                    module_content += `,\n\t\t.db_reg(db_reg_Sys${soc.buses[bus_index].id})`
        }
        for (var subSystem_index in subSystems){
            var busSignalsOut = false;
 
            var subSystem = subSystems_map.get(subSystems[subSystem_index].id)
            for(var slave_index in subSystem.slaves){
                if(IPs_map.get(subSystem.slaves[slave_index].type) == undefined){
                    fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + subSystem.slaves[slave_index].type, (err) => { 
                        // In case of a error throw err. 
                        if (err) throw err; 
                    }) 
                }
                if(IPs_map.get(subSystem.slaves[slave_index].type).module_type != "hard"){             
                    for (var ext_typex in IPs_map.get(subSystem.slaves[slave_index].type).externals){
                        var external = IPs_map.get(subSystem.slaves[slave_index].type).externals[ext_typex]
                        module_content += `,\n\t\t.${external.port}_SS${subSystem_index}_S${slave_index}(${external.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                    }
                }else{
                    //Getting subsystems hard modules signals out of the module
                    if(IPs_map.get(subSystem.slaves[slave_index].type).interface_type == "GEN"){//Handling Generic Hard Modules             
                        if (IPs_map.get(subSystem.slaves[slave_index].type).regs != undefined){
                            for (var reg_typex in IPs_map.get(subSystem.slaves[slave_index].type).regs){
                                var reg = IPs_map.get(subSystem.slaves[slave_index].type).regs[reg_typex]
                                if (reg.fields != undefined){
                                    for (var i = 0; i < reg.fields.length; i++){
                                        module_content += `,\n\t\t.${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index}(${reg.port}_${reg.fields[i].name}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                                    }
                                } else {
                                    module_content += `,\n\t\t.${reg.port}_SS${subSystem_index}_S${slave_index}(${reg.port}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                                }

                                if(reg.access_pulse != undefined){
                                    module_content += `,\n\t\t.${reg.access_pulse}_SS${subSystem_index}_S${slave_index}(${reg.access_pulse}_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                                }
                            }
                        }
                    }else{//Handling Non GENERIC HARD MODULES, TAKE BUS SIGNALS OUT ONCE
                        if(busSignalsOut == false){
                            module_content+=`,\n\t\t.PCLK_SS${subSystem_index}(PCLK_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                            .PRESETn_SS${subSystem_index}(PRESETn_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                            .PADDR_SS${subSystem_index}(PADDR_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                            .PWRITE_SS${subSystem_index}(PWRITE_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                            .PWDATA_SS${subSystem_index}(PWDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}),
                            .PENABLE_SS${subSystem_index}(PENABLE_Sys${soc.buses[bus_index].id}_SS${subSystem_index})
                         `   
                            busSignalsOut = true;
                        }
                        
                        module_content+=`        
                        // APB Slave Signals
                        ,.PRDATA_SS${subSystem_index}_S${slave_index}(PRDATA_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),
                        .PSEL_SS${subSystem_index}_S${slave_index}(PSEL_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index}),
                        .PREADY_SS${subSystem_index}_S${slave_index}(PREADY_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                        
                    }  
                }

                if (IPs_map.get(subSystem.slaves[slave_index].type).irqs != undefined){
                    if (IPs_map.get(subSystem.slaves[slave_index].type).irqs.length > 0)
                    {
                        module_content += `,\n\t\t.IRQ_SS${subSystem_index}_S${slave_index}(IRQ_Sys${soc.buses[bus_index].id}_SS${subSystem_index}_S${slave_index})`
                    }
                }
                    


            }
        }
        module_content+=`);
        
        `
        return module_content
    }
}

function ahb_sys(IPs_map, subSystems_map,soc, address_space, page_bits, Directory){
            
    var subSystems = soc.subsystems;

    //generate AHB bus
    ahb_bus_generator.ahb_bus_gen(soc.id, soc.slaves,subSystems,address_space,page_bits,Directory);

    //generate slaves' wrappers and AHB Sys
    fs.writeFile(Directory+'AHBlite_sys_' + soc.id + '.v', ahb_sys_gen1(IPs_map, subSystems_map, soc, address_space, page_bits,Directory), (err) => {    
        if (err) throw err; 
    }) 

    //generate AHB Sys testbench
//    ahb_sys_tb_generator.ahb_sys_tb_gen(soc.slaves, soc.subsystems,subSystems_map, IPs_map, address_space, page_bits,soc.id,Directory)

}
function ahb_sys_gen1(IPs_map, subSystems_map, soc, address_space, page_bits,Directory){
    var slaves = soc.slaves
    var SysID = soc.id
    var subSystems = soc.subsystems

    var busSignalsOut = false

    var line = `
\`timescale 1ns/1ns
module AHBlite_sys_${SysID}(
\t\tinput HCLK,
\t\tinput HRESETn,
     
\t\tinput [${address_space-1}: 0] HADDR,
\t\tinput [31: 0] HWDATA,
\t\tinput HWRITE,
\t\tinput [1: 0] HTRANS,
\t\tinput [2:0] HSIZE,

\t\toutput HREADY,
\t\toutput [31: 0] HRDATA,

\t\tinput [7: 0] Input_DATA,
\t\tinput [0: 0] Input_irq,
\t\toutput Output_DATA`

    for(var slave_index in slaves){
        line += ``
        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        if (slaves[slave_index].type == 9)
            line += `,\n\t\toutput wire [3:0] db_reg`
        if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){    
            for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                line += `,\n\t\t`+(external.input?`input wire `:`output wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],external)) - 1}: 0] ${external.port}_S${slave_index}`
            }
        }else{
            //Declaring system's hard modules signals as module interface signals
            if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){   
                if (IPs_map.get(slaves[slave_index].type).regs != undefined){ 
                    for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                        var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                        var size = parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg));
                        if (reg.fields != undefined){
                            for (var i = 0; i < reg.fields.length; i++){
                                line += `,\n\t\t`+(reg.access?`input`:`output`) +`[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_S${slave_index}`
                            }
                        } else {
                            line += `,\n\t\t`+(reg.access?`input`:`output`) +`[${size - 1}: 0] ${reg.port}_S${slave_index}`
                        }

                        if(reg.access_pulse != undefined){
                            line += `,\n\t\toutput ${reg.access_pulse}_S${slave_index}`
                        }
                    }
                }
            }else{ //HARD NON-GENERIC MODULES, extract HREADYOUT, HRESP, slave specific signals
                if(busSignalsOut == false){
                    
                    line+=`,\n\t\toutput [1:0] HRESP`
                    busSignalsOut = true;
                }
                
                line += `,\n\t\toutput HSEL_S${slave_index},`
                line += `\n\t\tinput [31:0] HRDATA_S${slave_index},`
                line += `\n\t\tinput HREADY_S${slave_index}`
            }
        }

        if (IPs_map.get(slaves[slave_index].type).irqs != undefined){
            if (IPs_map.get(slaves[slave_index].type).irqs.length > 0)
            {
                line += `,\n\t\toutput IRQ_S${slave_index}`
            }
        }      
    }
    for (var subSystem_index in subSystems){ 
        var busSignalsOut = false;
        var subSystem = subSystems_map.get(subSystems[subSystem_index].id)
        for(var slave_index in subSystem.slaves){
            line += ``
            if(IPs_map.get(subSystem.slaves[slave_index].type) == undefined){
                fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + subSystem.slaves[slave_index].type, (err) => { 
                    // In case of a error throw err. 
                    if (err) throw err; 
                }) 
            }
            if (IPs_map.get(subSystem.slaves[slave_index].type).module_type != "hard"){        
                for (var ext_typex in IPs_map.get(subSystem.slaves[slave_index].type).externals){

                    var external = IPs_map.get(subSystem.slaves[slave_index].type).externals[ext_typex]
                    line += `,\n\t\t`+(external.input?`input wire `:`output wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(subSystem.slaves[slave_index].type),subSystem.slaves[slave_index],external)) - 1}: 0] ${external.port}_SS${subSystem_index}_S${slave_index}`
                    
                }
            }else{
                //Hard modules
                if (IPs_map.get(subSystem.slaves[slave_index].type).interface_type == "GEN"){ 
                    if (IPs_map.get(subSystem.slaves[slave_index].type).regs != undefined){                  
                        for (var reg_typex in IPs_map.get(subSystem.slaves[slave_index].type).regs){
                            var reg = IPs_map.get(subSystem.slaves[slave_index].type).regs[reg_typex]
                            var size = parseInt(utils.getSize(IPs_map.get(subSystem.slaves[slave_index].type),subSystem.slaves[slave_index],reg));
                            if (reg.fields != undefined){
                                for (var i = 0; i < reg.fields.length; i++){
                                    line += `,\n\t\t`+(reg.access?`input`:`output`) +`[${parseInt(utils.getSize(IPs_map.get(subSystem.slaves[slave_index].type),subSystem.slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index}`
                                }
                            } else {
                                line += `,\n\t\t`+(reg.access?`input`:`output`) +`[${size - 1}: 0] ${reg.port}_SS${subSystem_index}_S${slave_index}`
                            }
                            if(reg.access_pulse != undefined){
                                line += `,\n\t\toutput ${reg.access_pulse}_SS${subSystem_index}_S${slave_index}`
                            }
                        }
                    }
                }else{   //else HARD NON-GENERIC MODULES, extract slave specific signals
                    if(busSignalsOut == false){
                        line+=`,\n\t\toutput wire PCLK_SS${subSystem_index},
                        output wire PRESETn_SS${subSystem_index},
                        output wire [${address_space-1}:0] PADDR_SS${subSystem_index},
                        output wire PWRITE_SS${subSystem_index},
                        output wire [31:0] PWDATA_SS${subSystem_index},
                        output wire PENABLE_SS${subSystem_index}
                     `   
                        busSignalsOut = true;
                    }
                    
                    line+=`        
                    // APB Slave Signals
                    ,input wire [31:0] PRDATA_SS${subSystem_index}_S${slave_index},
                    output wire PSEL_SS${subSystem_index}_S${slave_index},
                    input wire PREADY_SS${subSystem_index}_S${slave_index}`
                    
                }
            }
            if (IPs_map.get(subSystem.slaves[slave_index].type).irqs != undefined){
                if(IPs_map.get(subSystem.slaves[slave_index].type).irqs.length > 0)
                {
                    line += `,\n\t\toutput IRQ_SS${subSystem_index}_S${slave_index}`
                }
            }     
        }
    }

    line +=`\n\t);`

    line +=ahb_bus_gen(SysID,IPs_map,slaves,subSystems,address_space,page_bits,Directory);
    if(subSystems!= undefined){
        line += subSystemsGen(subSystems,subSystems_map,IPs_map,address_space, page_bits,Directory)
    }
    line += `
    always @(posedge HCLK)
	if(HTRANS[1] & HREADY)
        $display("Mem request (%d) A:%X", HWRITE, HADDR);
        
    endmodule
        `
     
    return line;
}



function ahb_bus_gen(SysID,IPs_map,slaves,subSystems,address_space,page_bits,Directory){
    var line = `
        
        //Inputs
        wire`
        
        for(var slave_index in slaves)
        line += ` HSEL_S${slave_index},`;
        for (var subSystem_index in subSystems)
        line += ` HSEL_SS${subSystem_index};`

        line = line.slice(0, -1);
        line += `;`;

        line += `
        //wire [${address_space-1}: 0] HADDR;
        //wire HWRITE;
        //wire [1: 0] HTRANS;
        //wire [1: 0] HSIZE;
        //wire [31: 0] HWDATA;

        //Outputs
        wire    [31:0]  `;

        for(var slave_index in slaves)
        line += ` HRDATA_S${slave_index},`;
        for (var subSystem_index in subSystems)
        line += ` HRDATA_SS${subSystem_index},`;
        line += ` HRDATA;`
        
        line += `
        wire            `
        for(var slave_index in slaves)
        line += ` HREADY_S${slave_index},`;
        for (var subSystem_index in subSystems)
        line += ` HREADY_SS${subSystem_index},`;
        line += ` HREADY;`

        line += `
        wire  [1:0]   HRESP;
        wire          IRQ;
        `

        line += slaves_instantiation(IPs_map,slaves,address_space,page_bits,Directory)

        line += bus_instantiation(SysID,slaves,subSystems)
  
    return line; 
}

function slaves_instantiation(IPs_map,slaves,address_space,page_bits,Directory){
    let offset_end = address_space - page_bits - 1

    var line = ``;
    for(var slave_index in slaves){

        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
      
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
            if (slaves[slave_index].type != 9){
                if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                    for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                        var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                        var size = parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg));
    
                        if (reg.fields != undefined){
                            for (var i = 0; i < reg.fields.length; i++){
                                line += `\n\t\twire [${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_S${slave_index};`
                            }
                        } else {
                            line += `\n\t\twire [${size - 1}: 0] ${reg.port}_S${slave_index}`
                    //         if (IPs_map.get(slaves[slave_index].type).module_type != "hard" && reg.access == 1 && reg.initial_value != null)
                    //             line += ` = 32'h${reg.initial_value};
                    // `
                    //         else 
                                line += `;\n`
                        }
                        if(reg.access_pulse != undefined){
                            line += `\n\t\twire ${reg.access_pulse}_S${slave_index};`
                        }
                    }
                }
            }
        }
    }
    for(var slave_index in slaves){

        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
      
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
            if(IPs_map.get(slaves[slave_index].type) != undefined){
                if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN")    
                    wrapper.ahb_wrapper(IPs_map.get(slaves[slave_index].type),slaves[slave_index], address_space, page_bits, 0,Directory)
                if (slaves[slave_index].type != 9){
                    if (IPs_map.get(slaves[slave_index].type).module_type == "soft")
                    line += digital_modules_instantiation(IPs_map,slaves,slave_index)
            
                if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
                    line += 
            `
            //AHB Slave # ${slave_index}
            AHBlite_` + IPs_map.get(slaves[slave_index].type).name + ` S_${slave_index} (
                .HCLK(HCLK),
                .HRESETn(HRESETn),
                .HSEL(HSEL_S${slave_index}),
                .HADDR(HADDR[${offset_end}:2]),
                .HREADY(HREADY),
                .HWRITE(HWRITE),
                .HTRANS(HTRANS),
                .HSIZE(HSIZE),
                .HWDATA(HWDATA),
    
                `
                var tmpSlave = IPs_map.get(slaves[slave_index].type);
        
                if (tmpSlave != undefined){
                    if (tmpSlave.regs != undefined){
                        for(var j =0; j < tmpSlave.regs.length; j++){
                            reg = tmpSlave.regs[j];
                            
                            if (reg.fields != undefined){
                                for (var i = 0; i < reg.fields.length; i++){
                                    line += `\n\t\t\t.${reg.port}_${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_S${slave_index}),`
                                }
                            }
                            else {
                                line += `\n\t\t\t.${reg.port}(${reg.port}_S${slave_index}),`
                            }
                            if(reg.access_pulse != undefined){
                                line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_S${slave_index}),`
                            }
                        }
                    }
        
                }
        
                if (IPs_map.get(slaves[slave_index].type).irqs != undefined){
                    if (IPs_map.get(slaves[slave_index].type).irqs.length > 0)
                    {
                        line += `\n\t\t\t.IRQ(IRQ_S${slave_index}),`
                    }
                } 
                    
    
                line += 
                `
                .HRDATA(HRDATA_S${slave_index}),
                .HREADYOUT(HREADY_S${slave_index}),
                .HRESP(HRESP)
            );
                `;
                }

                }
                else {
                    line += 
            `
            //AHB Slave # ${slave_index}
            AHBlite_` + IPs_map.get(slaves[slave_index].type).name + ` S_${slave_index} (
                .HCLK(HCLK),
                .HRESETn(HRESETn),
                .HSEL(HSEL_S${slave_index}),
                .HADDR(HADDR[${offset_end}:2]),
                .HREADY(HREADY),
                .HWRITE(HWRITE),
                .HTRANS(HTRANS),
                .HSIZE(HSIZE),
                .HWDATA(HWDATA),
                .db_reg(db_reg),

                .HRDATA(HRDATA_S${slave_index}),
                .HREADYOUT(HREADY_S${slave_index}),
                .HRESP(HRESP));
                `
                }


            }
            else 
                console.log("Missing IP type = "+ slaves[slave_index].type + " in library.")
    }
    return line;
}

function digital_modules_instantiation(IPs_map,slaves,slave_index){
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

                line += `.`+param.name + `(` + utils.getParamValue(IP,slaves[slave_index],param.name)+`) ,`
             }
            if(line[line.length-1] == ',')
                line = line.slice(0, -1);
            line+=`)`
         }
        
        line +=` S${slave_index} ( `

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
                            line += `\n\t\t\t.${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_S${slave_index}),`//Suspecting a BUG here
                        }
                    } else {
                        line += `\n\t\t\t.${reg.port}(${reg.port}_S${slave_index}),`
                    }
                    if(reg.access_pulse != undefined){
                        line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_S${slave_index}),`
                    }
                }
            }
        }else{ //NON-GENERIC SOFT MODULES CONNECTED TO AHB
            if(IPs_map.get(slaves[slave_index].type).interface_type != "AHB") throw new Error("IP type "+slaves[slave_index].type+" is not generic and doesn't have an AHB interface")
            
            var tmpSlaveInterface = IPs_map.get(slaves[slave_index].type).busInterface
    
            if(tmpSlaveInterface.HSEL != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HSEL}(HSEL_S${slave_index}),`
            if(tmpSlaveInterface.HADDR != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HADDR}(HADDR),`
            if(tmpSlaveInterface.HREADY != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HREADY}(HREADY),`
            if(tmpSlaveInterface.HWRITE != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HWRITE}(HWRITE),`
            if(tmpSlaveInterface.HTRANS != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HTRANS}(HTRANS),`
            if(tmpSlaveInterface.HSIZE != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HSIZE}(HSIZE),`
            if(tmpSlaveInterface.HWDATA != null)
              line += `\n\t\t\t.${tmpSlaveInterface.HWDATA}(HWDATA),`
            if(tmpSlaveInterface.HRDATA != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HRDATA}(HRDATA_S${slave_index}),`
            if(tmpSlaveInterface.HREADYOUT != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HREADYOUT}(HREADY_S${slave_index}),`
            if(tmpSlaveInterface.HRESP != null)
                line += `\n\t\t\t.${tmpSlaveInterface.HRESP}(HRESP),`
        }
        if (IPs_map.get(slaves[slave_index].type).module_type != "hard"){
            for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                line += `\n\t\t\t.${external.port}(${external.port}_S${slave_index}),`
            }
        }
        
        if(line[line.length-1] == ',')
            line = line.slice(0, -1);

        line += `
            );
            `
        return line
    }
}

function bus_instantiation(SysID,slaves,subSystems){
    var line = `
        `
    line += `
        //AHB Bus
        AHBlite_BUS${SysID} AHB(
            .HCLK(HCLK),
            .HRESETn(HRESETn),
          
            // Master Interface
            .HADDR(HADDR),
            .HWDATA(HWDATA), 
            .HREADY(HREADY),
            .HRDATA(HRDATA),`
    for(var slave_index in slaves){
        line += `
            
            // Slave # ${slave_index}
            .HSEL_S${slave_index}(HSEL_S${slave_index}),
            .HREADY_S${slave_index}(HREADY_S${slave_index}),
            .HRDATA_S${slave_index}(HRDATA_S${slave_index}),`
    }
    for(var subSystem_index in subSystems){
        line += `
            
            // Subsystem # ${subSystem_index}
            .HSEL_SS${subSystem_index}(HSEL_SS${subSystem_index}),
            .HREADY_SS${subSystem_index}(HREADY_SS${subSystem_index}),
            .HRDATA_SS${subSystem_index}(HRDATA_SS${subSystem_index}),`
    }

    line = line.slice(0, -1);
    line += `
        );
    `
    return line
}


function subSystemsGen(subSystems,subSystems_map,IPs_map,address_space, page_bits,Directory){
    
    for (var subSystem_index in subSystems){
        var subSystem = subSystems_map.get(subSystems[subSystem_index].id)
        let page = subSystems[subSystem_index].page
        switch(subSystem.bus_type){
            case 1:
                var prefix = "APB_sys_"+subSystem.id.toString()
                createDir(Directory+prefix+"/")        
                apb_sys_generator.apb_sys_gen(IPs_map, subSystem, address_space, page_bits, page,Directory+prefix+"/")
                return instantiateAPBfromAHB(subSystem,subSystem_index,IPs_map) //this should later depend on this bus type
        }
    }

}

function instantiateAPBfromAHB(subSystem,subSystem_index,IPs_map){
    var busSignalsOut = false
    var line = `
    //SubSystem Instantiation #${subSystem_index} 
    apb_sys_${subSystem.id} apb_sys_inst_${subSystem_index}(
        // Global signals --------------------------------------------------------------
        .HCLK(HCLK),
        .HRESETn(HRESETn),
    
        // AHB Slave inputs ------------------------------------------------------------
        .HADDR(HADDR),
        .HTRANS(HTRANS),
        .HWRITE(HWRITE),
        .HWDATA(HWDATA),
        .HSEL(HSEL_SS${subSystem_index}),
        .HREADY(HREADY),
    
        // AHB Slave outputs -----------------------------------------------------------
        .HRDATA(HRDATA_SS${subSystem_index}),
        .HREADYOUT(HREADY_SS${subSystem_index})`
    
    for(var slave_index in subSystem.slaves){
        line += ``
        if(IPs_map.get(subSystem.slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + subSystem.slaves[slave_index].type, (err) => { 
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        if(IPs_map.get(subSystem.slaves[slave_index].type).module_type != "hard"){
            for (var ext_typex in IPs_map.get(subSystem.slaves[slave_index].type).externals){
                var external = IPs_map.get(subSystem.slaves[slave_index].type).externals[ext_typex]
                line += `,\n\t\t.${external.port}_S${slave_index}(${external.port}_SS${subSystem_index}_S${slave_index})`
            }
        }else{
            //Hard modules
            if(IPs_map.get(subSystem.slaves[slave_index].type).interface_type == "GEN"){
                if (IPs_map.get(subSystem.slaves[slave_index].type).regs != undefined){
                    for (var reg_typex in IPs_map.get(subSystem.slaves[slave_index].type).regs){
                        var reg = IPs_map.get(subSystem.slaves[slave_index].type).regs[reg_typex]
                        if (reg.fields != undefined){
                            for (var i = 0; i < reg.fields.length; i++){
                                line += `,\n\t\t.${reg.port}_${reg.fields[i].name}_S${slave_index}(${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index})`
                            }
                        } else {
                            line += `,\n\t\t.${reg.port}_S${slave_index}(${reg.port}_SS${subSystem_index}_S${slave_index})`
                        }
                        if(reg.access_pulse != undefined){
                            line += `,\n\t\t.${reg.access_pulse}_S${slave_index}(${reg.access_pulse}_SS${subSystem_index}_S${slave_index})`
                        }
                    }
                }
            }else{ //NON_GENERIC HARD MODULES
                if(busSignalsOut ==false){
                line+=`,\n\t\t.PCLK(PCLK_SS${subSystem_index}),
                    .PRESETn(PRESETn_SS${subSystem_index}),
                    .PADDR(PADDR_SS${subSystem_index}),
                    .PWRITE(PWRITE_SS${subSystem_index}),
                    .PWDATA(PWDATA_SS${subSystem_index}),
                    .PENABLE(PENABLE_SS${subSystem_index})
                 `   
                 busSignalsOut = true;
                }
                line+=`        
                // APB Slave Signals
                ,.PRDATA_S${slave_index}(PRDATA_SS${subSystem_index}_S${slave_index}),
                .PSEL_S${slave_index}(PSEL_SS${subSystem_index}_S${slave_index}),
                .PREADY_S${slave_index}(PREADY_SS${subSystem_index}_S${slave_index})`
                
            }
        }

        if (IPs_map.get(subSystem.slaves[slave_index].type).irqs != undefined){
            if(IPs_map.get(subSystem.slaves[slave_index].type).irqs.length > 0)
            {
                line += `,\n\t\t.IRQ_S${slave_index}(IRQ_SS${subSystem_index}_S${slave_index})`
            }
        } 
        
    }

    line+=`
    );
    `
    return line
}