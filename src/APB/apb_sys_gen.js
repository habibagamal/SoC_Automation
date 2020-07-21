/*
This file automatically generates a verilog module for the APB System, the slaves' wrappers,
the APB bus, a bridge. 
*/
'use strict';

//dependencies
let wrapper = require("../wrapper.js");
let apb_bus_generator = require("./apb_bus_gen.js");
let utils = require("../utils/utils.js")
let apb_sys_tb_generator = require("./apb_tb_gen.js");
let apb_bridge_generator = require("./ahb2apb_bridge_gen.js")

const IRQEN_OFF = "40";

const fs = require('fs');

module.exports = {
    apb_sys_gen : function (IPs_map, subSystem, address_space, page_bits,page , Directory){
    let slaves = subSystem.slaves;

    //generate APB bus
    apb_bus_generator.apb_bus_gen(subSystem.id, subSystem.subpage_bits,Directory);
    
    //generate AHB-APB Bridge
    apb_bridge_generator.bridge_gen(address_space,Directory);

    //generate slaves' wrappers and APB Sys
    fs.writeFile(Directory+"APB_sys_" + subSystem.id + ".v", apb_sys_gen1(slaves, IPs_map, subSystem, address_space, page_bits , Directory), (err) => {    
        if (err) throw err; 
    }) 

    // generate APB Sys testbench
    //    apb_sys_tb_generator.apb_tb_gen(subSystem, IPs_map, address_space, page_bits , page,Directory)
    }
}


function apb_sys_gen1(slaves, IPs_map, subSystem, address_space, page_bits , Directory){
    //check if subpage bits is a multiple of 2
    if(subSystem.subpage_bits & 1 == 1){
        throw("subpage_bits must be a multiple of 2 in subsystem ID "+subSystem.id)
    }
    
    var busSignalsOut = false;

    var line = `
\`timescale 1ns/1ns
module apb_sys_${subSystem.id}(
    // Global signals --------------------------------------------------------------
    input wire          HCLK,
    input wire          HRESETn,

    // AHB Slave inputs ------------------------------------------------------------
    input wire  [${address_space-1}:0]  HADDR,
    input wire  [1:0]   HTRANS,
    input wire          HWRITE,
    input wire  [31:0]  HWDATA,
    input wire          HSEL,
    input wire          HREADY,

    // AHB Slave outputs -----------------------------------------------------------
    output wire [31:0]  HRDATA,
    output wire         HREADYOUT`
    
    for(var slave_index in slaves){
        line += ``
        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
            for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                line += `,\n\t`+(external.input?`input wire `:`output wire `)+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],external)) - 1}: 0] ${external.port}_S${slave_index}`
            }
        }else{
            //Hard Modules
            if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
                if(IPs_map.get(slaves[slave_index].type).regs != undefined){
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
                            module_content += `,\n\t\toutput ${reg.access_pulse}_S${slave_index}`
                        }
                    }
                }
            }else{ //NON-GENERIC HARD MODULES
                if(IPs_map.get(slaves[slave_index].type).interface_type != "APB") throw new Error("IP type "+toString(slaves[slave_index].type)+" is not generic and doesn't have an APB interface")

                if(busSignalsOut == false){
                    line+=`,\n\t\toutput PCLK,
                    output PRESETn,
                    output [${address_space-1}:0] PADDR,
                    output PWRITE,
                    output [31:0] PWDATA,
                    output PENABLE
                 `   
                    busSignalsOut = true;
                }
                
                line+=`        
                // APB Slave Signals
                ,input [31:0] PRDATA_S${slave_index},
                output PSEL_S${slave_index},
                input PREADY_S${slave_index}`
                
            }
        }
        
        if (IPs_map.get(slaves[slave_index].type).irqs != undefined && 
                IPs_map.get(slaves[slave_index].type).irqs.length > 0)
            {
                line += `,\n\n\toutput IRQ_S${slave_index}`
         }
    }

    line+=`
    );
    
    // APB Master Signals
    wire PCLK;
    wire PRESETn;
    wire [${address_space-1}:0] PADDR;
    wire PWRITE;
    wire [31:0] PWDATA;
    wire PENABLE;
    
    // APB Slave Signals
    wire PREADY;
    wire [31:0] PRDATA ;
    wire 		PSLVERR;

    //ADDED PSEL Signal
    //wire PSEL = HSEL; 
    wire PSEL_next = HSEL;
    reg PSEL_next_next;
    reg PSEL;
    always @ (posedge HCLK, negedge HRESETn)
    begin
        if(!HRESETn)
        PSEL <= 1'b0;
        else begin
            PSEL_next_next <= PSEL_next;
            PSEL <= PSEL_next | PSEL_next_next;
        end
    end`

    line+= apb_bridge_instantiation(address_space);

    line+=apb_bus_gen(subSystem.id, slaves, IPs_map, address_space, page_bits, subSystem.subpage_bits,Directory);
    return line;
}

function apb_bridge_instantiation(address_space){
    var line = `
    //Instantiating the bridge

    ahb_2_apb AHB2APB_BR (
        .HCLK(HCLK),
        .HRESETn(HRESETn),
        .HADDR(HADDR[${address_space-1}:0]),
        .HSEL(HSEL),
        .HREADY(HREADY),
        .HTRANS(HTRANS[1:0]),
        .HWDATA(HWDATA[31:0]),
        .HWRITE(HWRITE),
        .HRDATA(HRDATA),
        .HREADYOUT(HREADYOUT),
        .PCLK(PCLK),
        .PRESETn(PRESETn),
        .PADDR(PADDR[${address_space-1}:0]),
        .PWRITE(PWRITE),
        .PWDATA(PWDATA[31:0]),
        .PENABLE(PENABLE),
        .PREADY(PREADY),
        .PRDATA(PRDATA[31:0])
    );
        `
        return line
}



function apb_bus_gen(busID, slaves, IPs_map, address_space, page_bits, subpage_bits,Directory){
    var line = `
        
    //Bus Signals
        `
        
    for(var slave_index in slaves){
        line += `
    //Slave #${slave_index}
    wire PSEL_S${slave_index};
    wire [31:0] PRDATA_S${slave_index};
    wire PREADY_S${slave_index};
    wire PSLVERR_S${slave_index};
    `
        }
    line += `
    //Unused Ports Signals`
    for (var i = slaves.length; i < (1<<subpage_bits); i++){
        line += `
    wire PSEL_S${i};`
    }

    line += "\n"
    line += slaves_instantiation(slaves, IPs_map, address_space, page_bits, subpage_bits,Directory)


    line += bus_instantiation(busID, slaves, address_space, page_bits, subpage_bits)

    line += `
       
endmodule
    `
 
    return line; 
}

function slaves_instantiation(slaves, IPs_map, address_space, page_bits, subpage_bits,Directory){
    
    var line = `
`;
    for(var slave_index in slaves){
        
        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
      
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        
        if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
            if(IPs_map.get(slaves[slave_index].type).regs != undefined){
                for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                    var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                    var size = parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg));
                    if (reg.fields != undefined){
                        for (var i = 0; i < reg.fields.length; i++){
                            line += `  wire [${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_S${slave_index};\n`
                        }
                    } else {
                        line += `   wire [${size - 1}: 0] ${reg.port}_S${slave_index}`
                //         if (IPs_map.get(slaves[slave_index].type).module_type != "hard" &&reg.access == 1 && reg.initial_value != null)
                //             line += ` = 32'h${reg.initial_value};
                // `
                //         else 
                            line += `;
                `
                    }
                    if(reg.access_pulse != undefined){
                        line += `\n\t\twire ${reg.access_pulse}_S${slave_index};`
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
                wrapper.apb_wrapper(IPs_map.get(slaves[slave_index].type),slaves[slave_index] ,address_space, page_bits, subpage_bits,Directory)
    
            if (IPs_map.get(slaves[slave_index].type).module_type == "soft")
                line += digital_modules_instantiation(slaves, slave_index, IPs_map)
            
            if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
            line += 
        `
    //APB Slave # ${slave_index}
    APB_` + IPs_map.get(slaves[slave_index].type).name + ` S_${slave_index} (
        .PCLK(PCLK),
        //.PCLKG(),
        .PRESETn(PRESETn),
        .PSEL(PSEL_S${slave_index}),
        .PADDR(PADDR [${address_space - page_bits - subpage_bits-1}:2]),
        .PREADY(PREADY_S${slave_index}),
        .PWRITE(PWRITE),
        .PENABLE(PENABLE),
        .PWDATA(PWDATA),

        `
            if(IPs_map.get(slaves[slave_index].type).regs != undefined){
                for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                    var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                    if (reg.fields != undefined){
                        for (var i = 0; i < reg.fields.length; i++){
                            line += `.${reg.port}_${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_S${slave_index}),\n`
                        }
                    }
                    else {
                        line += `\n\t\t\t.${reg.port}(${reg.port}_S${slave_index}),\n`
                    }
                }
            }
            
            if (IPs_map.get(slaves[slave_index].type).irqs != undefined && 
                IPs_map.get(slaves[slave_index].type).irqs.length > 0)
            {
                line += `\n\t\t\t.IRQ(IRQ_S${slave_index}),`
            
            }
            if(reg.access_pulse != undefined){
                line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_S${slave_index}),`
            }
           
            line += 
            `\n\t\t\t.PRDATA(PRDATA_S${slave_index})\n\t\t);
            `;
        }

        } else 
            console.log("Missing IP type = "+ slaves[slave_index].type + " in library.")

    }
    return line;
}

function digital_modules_instantiation(slaves, slave_index, IPs_map){
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
        ` + IPs_map.get(slaves[slave_index].type).name
        
        var IP = IPs_map.get(slaves[slave_index].type)

        if(IP.params != undefined){
            line+=` #(` 
            for(var param_idx in IP.params){
                var param = IP.params[param_idx]
                
                line +=`.` +param.name+`( ` + utils.getParamValue(IP,slaves[slave_index],param.name)+`) ,`
             }
            if(line[line.length-1] == ',')
                line = line.slice(0, -1);
            line+=`)`
         }
         line+= ` S${slave_index} (`

    if (IP.bus_clock != undefined){
        line += `
        .${IP.bus_clock.name}(PCLK),`
    } 
    if (IP.bus_reset != undefined){
        if (IP.bus_reset.trig_level == 0){
            line += `
            .${IP.bus_reset.name}(PRESETn),`
        } else if (IP.bus_reset.trig_level == 1){
            line += `
            .${IP.bus_reset.name}(~PRESETn),`
        }
    }

    if(IPs_map.get(slaves[slave_index].type).interface_type == "GEN"){
        if(IPs_map.get(slaves[slave_index].type).regs != undefined){
            for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                
                if (reg.fields != undefined){
                    for (var i = 0; i < reg.fields.length; i++){
                        line += `\n\t\t\t.${reg.fields[i].name}(${reg.port}_${reg.fields[i].name}_S${slave_index}),`
                    }
                } else {
                    line += `\n\t\t\t.${reg.port}(${reg.port}_S${slave_index}),`
                }

                if(reg.access_pulse != undefined){
                    line += `\n\t\t\t.${reg.access_pulse}(${reg.access_pulse}_S${slave_index}),`
                }
            }
        }
    }else{//NON-GENERIC SOFT MODULES CONNECTED TO APB
        if(IPs_map.get(slaves[slave_index].type).interface_type != "APB") throw new Error("IP type "+ slaves[slave_index].type +" is not generic and doesn't have an APB interface")
        
        var tmpSlaveInterface = IPs_map.get(slaves[slave_index].type).busInterface

        if(tmpSlaveInterface.PSEL != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PSEL}(PSEL_S${slave_index}),`
        if(tmpSlaveInterface.PADDR != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PADDR}(PADDR),`
        if(tmpSlaveInterface.PREADY != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PREADY}(PREADY_S${slave_index}),`
        if(tmpSlaveInterface.PWRITE != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PWRITE}(PWRITE),`
        if(tmpSlaveInterface.PWDATA != null)
          line += `\n\t\t\t.${tmpSlaveInterface.PWDATA}(PWDATA),`
        if(tmpSlaveInterface.PRDATA != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PRDATA}(PRDATA_S${slave_index}),`
        if(tmpSlaveInterface.PENABLE != null)
            line += `\n\t\t\t.${tmpSlaveInterface.PENABLE}(PENABLE),`
            
    }

    if(IPs_map.get(slaves[slave_index].type).module_type == "hard" || IPs_map.get(slaves[slave_index].type).externals == undefined || IPs_map.get(slaves[slave_index].type).externals.length == 0)
       line = line.slice(0, -1); 
    line += `
        `
    if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
        for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
            var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
            line += `   
                .${external.port}(${external.port}_S${slave_index}),`
        }
    }
    if(line[line.length-1] == ',')
        line = line.slice(0, -1);

    line += `
        );
        `
    return line
}

function bus_instantiation(busID, slaves, address_space, page_bits, subpage_bits){
    var line = `
        `
    line += `
    //APB Bus
    APB_BUS${busID} #(`
        for (var i = 0; i < (1<<subpage_bits); i++){
            line += `
        .PORT${i}_ENABLE`
            if (i < slaves.length)
                line += `   (1),`
            else 
                line += `   (0),`
        }
    line = line.slice(0, -1);

    line += `
    )
    apbBus(
        // Inputs
        .DEC_BITS   (PADDR[${address_space - page_bits -1}:${address_space - page_bits -subpage_bits}]),
        .PSEL       (PSEL),
`
        for (var i = 0; i < (1<<subpage_bits); i++){
            line += `
        .PSEL_S${i}         (PSEL_S${i}),`
            if (i < slaves.length)
                line += `
        .PREADY_S${i}       (PREADY_S${i}),
        .PRDATA_S${i}       (PRDATA_S${i}),
        // .PSLVERR${i}     (timer${i}_pslverr),
        .PSLVERR_S${i}      (1'b0),
        `
            else 
                line += `
        .PREADY_S${i}       (1'b1),
        .PRDATA_S${i}       (32'h00000000),
        .PSLVERR_S${i}      (1'b0),
        `
        }
    line = line.slice(0, -1);
    line += `    
        // Output
        .PREADY            (PREADY),
        .PRDATA            (PRDATA),
        .PSLVERR           (PSLVERR)
        );`

    return line
}