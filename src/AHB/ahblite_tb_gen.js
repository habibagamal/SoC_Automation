/*
This file automatically generates a verilog testbench for the AHB Sys
*/
'use strict';
const IRQEN_OFF = "40";

const fs = require('fs');
let ahb_master_generator = require("./ahblite_master_gen.js")
let utils = require("../utils/utils")
module.exports = {
ahb_sys_tb_gen:function (slaves, subsystems,subSystems_map, IPs_map, address_space, page_bits,SysID,Directory){
    var line = `
\`timescale 1ns/1ns
module AHBlite_sys${SysID}_tb;

\n\t//General Inputs
\treg HCLK;
\treg HRESETn;

\treg [7: 0] Input_DATA;
\treg [0: 0] Input_irq;

\t//Connected to Master
\twire [${address_space - 1}: 0] HADDR;
\twire [31: 0] HWDATA;
\twire HWRITE;
\twire [1: 0] HTRANS;
\twire [2:0] HSIZE;

\t//General Outputs
\twire Output_DATA;
\twire HREADY;
\twire [31: 0] HRDATA;`


//dummy master generation
ahb_master_generator.ahb_master_gen(SysID, slaves, subsystems,subSystems_map, IPs_map, address_space, page_bits, Directory);

//AHB Sys instantiation
var instLine = `\n\n\t//Module instantiation
\tAHBlite_sys_${SysID} uut(
\t\t.HCLK(HCLK),
\t\t.HRESETn(HRESETn),

\t\t.HADDR(HADDR),
\t\t.HWDATA(HWDATA),
\t\t.HWRITE(HWRITE),
\t\t.HTRANS(HTRANS),
\t\t.HSIZE(HSIZE),

\t\t.HREADY(HREADY),
\t\t.HRDATA(HRDATA),

\t\t.Input_DATA(Input_DATA),
\t\t.Input_irq(Input_irq),
\t\t.Output_DATA(Output_DATA)
`

//initial begin
var initLine = `\n\n\t//clock and initial begin block
\talways #5 HCLK = ~HCLK;

\tinitial begin
\t\t//Reseting
\t\tHRESETn = 0;
\t\tHCLK = 0;
\t\t#10;
\t\tHRESETn = 1;
\t\t//Inputs initialization
\t\tInput_DATA = 0;
\t\tInput_irq = 0;`

    for(var slave_index in slaves){
        line += `\n\n`
        if(IPs_map.get(slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
      
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        
        line+=`\t//Slave #` +slave_index;
        if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
            for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                line += `\n\t`+(external.input?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],external)) - 1}: 0] ${external.port}_S${slave_index};`
                instLine += `,\n\t\t.${external.port}_S${slave_index}(${external.port}_S${slave_index})`
                initLine += external.input?`\n\t\t${external.port}_S${slave_index}=0;`:``
            }
        }else{
            //Hard Modules
            if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                    var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                    if (reg.fields != undefined){
                        for (var i = 0; i < reg.fields.length; i++){
                            line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_S${slave_index};`
                            instLine += `,\n\t\t.${reg.port}_${reg.fields[i].name}_S${slave_index}(${reg.port}_${reg.fields[i].name}_S${slave_index})`
                            initLine += reg.access?`\n\t\t${reg.port}_${reg.fields[i].name}_S${slave_index}=0;`:``
                        }
                    } else {
                        line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg)) - 1}: 0] ${reg.port}_S${slave_index};`
                        instLine += `,\n\t\t.${reg.port}_S${slave_index}(${reg.port}_S${slave_index})`
                        initLine += reg.access?`\n\t\t${reg.port}_S${slave_index}=0;`:``
                    }
                }
            }
        }

        if (IPs_map.get(slaves[slave_index].type).irqs != undefined && 
        IPs_map.get(slaves[slave_index].type).irqs.length > 0)
        {
            line += `\n\twire IRQ_S${slave_index};`
            instLine += `,\n\t.IRQ_S${slave_index}(IRQ_S${slave_index})`
            //initLine += `\n\t\tIRQ_S${slave_index}=0;`
        }
    }

    for (var subSystem_index in subsystems){
        var  id = subsystems[subSystem_index].id
        var subsystem = subSystems_map.get(id)
        let slaves = subsystem.slaves;
        
        line += `\n\n\t//Subsystem id: ${subSystem_index}\n`
        for (var slave_index in slaves){
            if(IPs_map.get(slaves[slave_index].type) == undefined){
                fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + slaves[slave_index].type, (err) => { 
          
                    // In case of a error throw err. 
                    if (err) throw err; 
                }) 
            }
            
            line+=`\n\t//Subsystem Slave #` + slave_index + "\n";
            if(IPs_map.get(slaves[slave_index].type).module_type != "hard"){
                for (var ext_typex in IPs_map.get(slaves[slave_index].type).externals){
                    var external = IPs_map.get(slaves[slave_index].type).externals[ext_typex]
                    line += `\n\t`+(external.input?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],external)) - 1}: 0] ${external.port}_SS${subSystem_index}_S${slave_index};`
                    instLine += `,\n\t\t.${external.port}_SS${subSystem_index}_S${slave_index}(${external.port}_SS${subSystem_index}_S${slave_index})`
                    initLine += external.input?`\n\t\t${external.port}_SS${subSystem_index}_S${slave_index}=0;`:``
                }
            }else{
                //Hard Module
                if (IPs_map.get(slaves[slave_index].type).regs != undefined){
                    for (var reg_typex in IPs_map.get(slaves[slave_index].type).regs){
                        var reg = IPs_map.get(slaves[slave_index].type).regs[reg_typex]
                        if (reg.fields != undefined){
                            for (var i = 0; i < reg.fields.length; i++){
                                line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index};`
                                instLine += `,\n\t\t.${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index}(${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index})`
                                initLine += reg.access?`\n\t\t${reg.port}_${reg.fields[i].name}_SS${subSystem_index}_S${slave_index}=0;`:``
                            }
                        } else {
                            line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(slaves[slave_index].type),slaves[slave_index],reg)) - 1}: 0] ${reg.port}_SS${subSystem_index}_S${slave_index};`
                            instLine += `,\n\t\t.${reg.port}_SS${subSystem_index}_S${slave_index}(${reg.port}_SS${subSystem_index}_S${slave_index})`
                            initLine += reg.access?`\n\t\t${reg.port}_SS${subSystem_index}_S${slave_index}=0;`:``
                        }
                    }
                }
            }
            if (IPs_map.get(subsystem.slaves[slave_index].type).irqs != undefined && 
            IPs_map.get(subsystem.slaves[slave_index].type).irqs.length > 0)
            {
                line += `\n\twire IRQ_SS${subSystem_index}_S${slave_index};`
                instLine += `,\n\t.IRQ_SS${subSystem_index}_S${slave_index}(IRQ_SS${subSystem_index}_S${slave_index})`
                //initLine += `\n\t\tIRQ_SS${subSystem_index}_S${slave_index}=0;`
            }
        }
    }


    //master instantiation
    line += `
\n\t//AHB Master Instantiation
\tAHBlite_dummyMaster${SysID} M (
\t\t.HCLK(HCLK),
\t\t.HRESETn(HRESETn),

\t\t.HADDR(HADDR),
\t\t.HWDATA(HWDATA),
\t\t.HWRITE(HWRITE),
\t\t.HTRANS(HTRANS),
\t\t.HSIZE(HSIZE),

\t\t.HREADY(HREADY),
\t\t.HRDATA(HRDATA)
\t);
    `
    line += instLine;
    line += `\n\t);`

    line += initLine;
    line += `\n\t\t//Start Here\n\t\t#100;\n\tend\n\nendmodule`

    //return line;
    fs.writeFile(Directory+"AHBlite_sys" + SysID + '_tb.v', line, (err) => { 
      
    // In case of a error throw err. 
    if (err) throw err; 
    }) 
} 
}