'use strict';
const IRQEN_OFF = "40";
const fs = require('fs');

module.exports ={
ahb_bus_gen :function (busID, slaves, subSystems, address_space, page_bits, Directory){

    var line = `
    \`timescale 1ns/1ns
    module AHBlite_BUS${busID}(
        input wire HCLK,
        input wire HRESETn,
      
        // Master Interface
        input wire [${address_space-1}:0] HADDR,
        input wire [31:0] HWDATA, 
        output wire [31:0] HRDATA,
        output wire        HREADY`;
    for(var slave_index in slaves){
        line += `,
        // Slave # ${slave_index}
        output wire         HSEL_S${slave_index},
        input wire          HREADY_S${slave_index},
        input wire  [31:0]  HRDATA_S${slave_index}`;
    }
    for(var subSystem_index in subSystems){
        line += `,
        // Slave # ${slave_index}
        output wire         HSEL_SS${subSystem_index},
        input wire          HREADY_SS${subSystem_index},
        input wire  [31:0]  HRDATA_SS${subSystem_index}`;
    }
    line += `
    );
        wire [${page_bits}:0]  PAGE = HADDR[${address_space-1}:${address_space- page_bits}];
        reg [${page_bits}:0] APAGE;

        always@ (posedge HCLK or negedge HRESETn) begin
        if(!HRESETn)
            APAGE <= ${page_bits}'h0;
        else if(HREADY)
            APAGE <= PAGE;
        end

    `;
    for(var slave_index in slaves){
        let page = slaves[slave_index].page.toString(16);
        line += `\tassign HSEL_S${slave_index} = (PAGE == ${page_bits}'h${page});\n\t`;
    }

    for(var subSystem_index in subSystems){
        let page = subSystems[subSystem_index].page.toString(16);
        line += `\tassign HSEL_SS${subSystem_index} = (PAGE == ${page_bits}'h${page});\n\t`;
    }

    line += `\n
        assign HREADY =\n`;
    for(var slave_index in slaves){
        let page = slaves[slave_index].page.toString(16);
        line += `\t\t\t(APAGE == ${page_bits}'h${page}) ? HREADY_S${slave_index} :\n`;
    }

    for(var subSystem_index in subSystems){
        let page = subSystems[subSystem_index].page.toString(16);
        line += `\t\t\t(APAGE == ${page_bits}'h${page}) ? HREADY_SS${subSystem_index} :\n`;
    }
    line += `\t\t\t1'b1;\n`;

    line += `\n
        assign HRDATA =\n`;
    for(var slave_index in slaves){
        let page = slaves[slave_index].page.toString(16);
        line += `\t\t\t(APAGE == ${page_bits}'h${page}) ? HRDATA_S${slave_index} :\n`;
    }

    for(var subSystem_index in subSystems){
        let page = subSystems[subSystem_index].page.toString(16);
        line += `\t\t\t(APAGE == ${page_bits}'h${page}) ? HRDATA_SS${subSystem_index} :\n`;
    }
    line += `\t\t\t32'hDEADBEEF;\n`;
    line += `\nendmodule`;
    //return line;

    fs.writeFile(Directory+ "AHBlite_bus" + busID + ".v", line, (err) => {
        if (err)
            throw err; 
    })
} }