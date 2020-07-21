'use strict';
const IRQEN_OFF = "40";

const fs = require('fs');

module.exports = {
ahb_master_gen:function (sysID, slaves, subsystems,subSystems_map, IPs_map, address_space, page_bits,Directory){


  var line = ""
  line += `
\`timescale 1ns/1ns

\`define BYTE  3'b000
\`define HWORD 3'b001
\`define WORD  3'b010

module AHBlite_dummyMaster${sysID} (
  input HCLK,
  input HRESETn,
 
  output [${address_space - 1}: 0] HADDR,
  output [31: 0] HWDATA,
  output HWRITE,
  output [1: 0] HTRANS,
  output [2:0] HSIZE,

  input HREADY,
  input [31: 0] HRDATA
);
  
  reg [${address_space - 1}: 0] HADDR;
  reg [1: 0] HTRANS;
  reg [2:0] HSIZE;
  reg [31: 0] HWDATA;
  reg HWRITE;
  
  task AHB_RD;
    input [${address_space - 1}:0] A;
    input [2:0] SZ;
    output [31:0] D;
    begin
      @(posedge HCLK);
      HWRITE <= 0;
      HADDR <= A;
      HSIZE <= SZ;
      HTRANS <= 2'b10;
      @(posedge HCLK);
      HTRANS <= 2'b00;
      @(posedge HCLK);
      while (HREADY == 1'b0) begin
        @(posedge HCLK);  
      end
      D = HRDATA;
      $display("Read 0x%X from 0x%X", D, A);
    end  
  endtask
  
  task AHB_WR;
    input [${address_space - 1}:0] A;
    input [2:0] SZ;
    input [31:0] D;
    begin
      @(posedge HCLK);
      HWRITE <= 1;
      HADDR <= A;
      HSIZE <= SZ;
      HTRANS <= 2'b10;
      @(posedge HCLK);
      HTRANS <= 2'b00;
      HWDATA = D;
      @(posedge HCLK);
      while (HREADY == 1'b0) begin
        @(posedge HCLK);  
      end
      $display("Wrote 0x%X to 0x%X", D, A);
    end  
  endtask
  
  
  reg [31:0] RDATA;
  
  initial begin
    // wait for reset
    #5;
    @(posedge HRESETn);
    HADDR <= 0;
    HWRITE = 0;
    HTRANS = 0;
    HSIZE = 0;
    #10;`

    // Looping over slaves 
    line += `\n\n // Testing WR/RD from Slaves \n`
    for(var slave_index in slaves){
    let page = slaves[slave_index].page.toString(16);
    let type = slaves[slave_index].type;

    var writeRegisters = new Array();
    var readRegisters = new Array(); 
    if (IPs_map.get(type).regs != undefined){
      for (var i = 0; i < IPs_map.get(type).regs.length; i++){
        let offset = IPs_map.get(type).regs[i].offset.toString(16);
        let access = IPs_map.get(type).regs[i].access;
        if (access == 1)
          readRegisters.push(offset);
        else 
          writeRegisters.push(offset);
      }
    }

    for (var i = 0; i < writeRegisters.length; i++){
      let offset = parseInt(writeRegisters[i]) << 2

      // Write
      line += `\n    AHB_WR(${address_space}'h`
      
      let page_bit_count = page_bits/4 - page.length
      let offset_bit_count = (address_space - page_bits) /4 - offset.toString(16).length
      
      while (page_bit_count > 0){
        line += `0`
        page_bit_count--
      }
      line += `${page}`

      while (offset_bit_count > 0){
        line += `0`
        offset_bit_count--
      }
      line += `${offset.toString(16)}, 2, 32'hABCD_${slave_index});\n    #20;`

      // Read
      line += `\n    AHB_RD(${address_space}'h`
      
      page_bit_count = page_bits/4 - page.length
      offset_bit_count = (address_space - page_bits) /4 - offset.toString(16).length
      
      while (page_bit_count > 0){
        line += `0`
        page_bit_count--
      }
      line += `${page}`

      while (offset_bit_count > 0){
        line += `0`
        offset_bit_count--
      }

      line += `${offset.toString(16)}, 2, RDATA);\n    #20;`
    }

    for (var i = 0; i < readRegisters.length; i++){
      let offset = parseInt(readRegisters[i]) << 2

      // Read
      line += `\n    AHB_RD(${address_space}'h`

      let page_bit_count = page_bits/4 - page.length
      let offset_bit_count = (address_space - page_bits) /4 - offset.toString(16).length
      
      while (page_bit_count > 0){
        line += `0`
        page_bit_count--
      }
      line += `${page}`

      while (offset_bit_count > 0){
        line += `0`
        offset_bit_count--
      }
      line += `${offset.toString(16)}, 2, RDATA);\n    #20;`
    }
  }

  // Looping over subsystems
  line += `\n\n // Testing WR/RD from Subsystems \n`

  for ( var subsystem_index in subsystems){
    var  id = subsystems[subsystem_index].id
     var subsystem = subSystems_map.get(id)
     let page = subsystems[subsystem_index].page;
     let slaves = subsystem.slaves;
     let subpage_bits = subsystem.subpage_bits;

    for (var slave_index in slaves){
      // let subpage = slaves[slave_index].subpage;
      let subpage = slave_index
      let type = slaves[slave_index].type;
      var writeRegisters = new Array();
      var readRegisters = new Array(); 

      if (IPs_map.get(type).regs != undefined){
        for (var i = 0; i < IPs_map.get(type).regs.length; i++){
          let offset = IPs_map.get(type).regs[i].offset;
          let access = IPs_map.get(type).regs[i].access;
          if (access == 1)
            readRegisters.push(offset);
          else 
            writeRegisters.push(offset);
        }
      }
      
      for (var i = 0; i < writeRegisters.length; i++){
        let offset = parseInt(writeRegisters[i])<<2
        line += `\n    AHB_WR(${address_space}'h`

        let page_bit_count = page_bits/4 - page.length
        let offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length

        let subpage_bit_count = subpage_bits/4 - subpage.length

        while (page_bit_count > 0){
          line += `0`
          page_bit_count--
        }
        line += `${page}`

        while (subpage_bit_count > 0){
          line += `0`
          subpage_bit_count--
        }
        line += `${subpage}`
        
        while (offset_bit_count > 0){
          line += `0`
          offset_bit_count--
        }
        line += `${offset.toString(16)}, 2, 32'hABCD_${slave_index});\n    #20;`


        page_bit_count = page_bits/4 - page.length
        offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length

        subpage_bit_count = subpage_bits/4 - subpage.length

        line += `\n    AHB_RD(${address_space}'h`
        while (page_bit_count > 0){
          line += `0`
          page_bit_count--
        }
        line += `${page}`

        while (subpage_bit_count > 0){
          line += `0`
          subpage_bit_count--
        }
        line += `${subpage}`
        
        while (offset_bit_count > 0){
          line += `0`
          offset_bit_count--
        }
        line += `${offset.toString(16)}, 2, RDATA);\n    #20;`

      }

      for (var i = 0; i < readRegisters.length; i++){
        let offset = parseInt(readRegisters[i])<<2;
        line += `\n    AHB_RD(${address_space}'h`

        let page_bit_count = page_bits/4 - page.length
        let offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length

        let subpage_bit_count = subpage_bits/4 - subpage.length

        while (page_bit_count > 0){
          line += `0`
          page_bit_count--
        }
        line += `${page}`

        while (subpage_bit_count > 0){
          line += `0`
          subpage_bit_count--
        }
        line += `${subpage}`
        
        while (offset_bit_count > 0){
          line += `0`
          offset_bit_count--
        }
        line += `${offset.toString(16)}, 2, RDATA);\n    #20;`

      }
    }

  }

  line += `\n  end\n\nendmodule`

  fs.writeFile(Directory+'AHBlite_dummyMaster' + sysID + '.v', line, (err) => {    
      if (err) throw err; 
  }) 
}
}