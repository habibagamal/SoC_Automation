'use strict';
const IRQEN_OFF = "40";

const fs = require('fs');

module.exports = {
  ahb_master_gen:function (master_id, slaves, subsystems, subSystems_map, IPs_map, address_space, page_bits,Directory){


    var line = ""
    line += `
\`timescale 1ns/1ns

\`define BYTE  3'b000
\`define HWORD 3'b001
\`define WORD  3'b010

module AHB_dummyMaster${master_id} (
\tinput HCLK,
\tinput HRESETn,
   
\toutput [${address_space - 1}: 0] HADDR,
\toutput [31: 0] HWDATA,
\toutput HWRITE,
\toutput [1: 0] HTRANS,
\toutput [2:0] HSIZE,
    
\tinput HREADY,
\tinput [31: 0] HRDATA,
    
\toutput [3:0] HPROT,
\toutput [2:0] HBURST,
\toutput reg HBUSREQ,
\toutput HLOCK,
\tinput HGRANT
);
    
\treg [${address_space - 1}: 0] HADDR;
\treg [1: 0] HTRANS;
\treg [2:0] HSIZE;
\treg [31: 0] HWDATA;
\treg HWRITE;
    
\tassign HPROT = 0;
\tassign HBURST = 0;
\tassign HLOCK = 0;
   

\ttask AHB_RD;
\t\tinput [${address_space - 1}:0] A;
\t\tinput [2:0] SZ;
\t\toutput [31:0] D;
\t\tbegin
\t\t\t@(posedge HCLK);
\t\t\tHWRITE <= 0;
\t\t\tHADDR <= A;
\t\t\tHSIZE <= SZ;
\t\t\tHTRANS <= 2'b10;
\t\t\tHBUSREQ <= 1'b1;
\t\t\twait(HGRANT == 1'b1);
\t\t\t@(posedge HCLK);
\t\t\tHTRANS <= 2'b00;
\t\t\t@(posedge HCLK);
\t\t\twhile (HREADY == 1'b0) begin
\t\t\t\t@(posedge HCLK);  
\t\t\tend
\t\t\tD = HRDATA;
\t\t\tHBUSREQ <= 1'b0;
\t\t\t$display("Read 0x%X from 0x%X", D, A);
\t\tend  
\tendtask
    
\ttask AHB_WR;
\t\tinput [${address_space - 1}:0] A;
\t\tinput [2:0] SZ;
\t\tinput [31:0] D;
\t\tbegin
\t\t\t@(posedge HCLK);
\t\t\tHWRITE <= 1;
\t\t\tHADDR <= A;
\t\t\tHSIZE <= SZ;
\t\t\tHTRANS <= 2'b10;
\t\t\tHBUSREQ <= 1'b1;
\t\t\twait(HGRANT==1'b1);
\t\t\t@(posedge HCLK);
\t\t\tHTRANS <= 2'b00;
\t\t\tHWDATA = D;
\t\t\t@(posedge HCLK);
\t\t\twhile (HREADY == 1'b0) begin
\t\t\t\t@(posedge HCLK);  
\t\t\tend
\t\t\tHBUSREQ <= 1'b0;
\t\t\t$display("Wrote 0x%X to 0x%X", D, A);
\t\tend  
\tendtask
    
    
\treg [31:0] RDATA;
    
\tinitial begin
\t\t// wait for reset
\t\t#5;
\t\t@(posedge HRESETn);
\t\t\tHADDR <= 0;
\t\t\tHWRITE = 0;
\t\t\tHTRANS = 0;
\t\t\tHSIZE = 0;
\t\t\tHBUSREQ <= 0;
\t\t\t#10;`

      // Looping over slaves 
      line += `\n\n\t// Testing WR/RD from Slaves \n`
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
        line += `\n\t\tAHB_WR(${address_space}'h`
        
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
        line += `\n\t\tAHB_RD(${address_space}'h`
        
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
        line += `\n\t\tAHB_RD(${address_space}'h`

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
    line += `\n\n\t// Testing WR/RD from Subsystems \n`
    for (var subsystem_index in subsystems){
      if (subsystems[subsystem_index] == undefined)
        continue;
      var  id = subsystems[subsystem_index].id
      var subsystem = subSystems_map.get(id)
      let page = subsystems[subsystem_index].page;
      let slaves = subsystem.slaves;
      let subpage_bits = subsystem.subpage_bits;

      for (var slave_index in slaves){
        // let subpage = slaves[slave_index].subpage;
        let subpage = slave_index;
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
          line += `\n\t\tAHB_WR(${address_space}'h`

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

          line += `\n\t\tAHB_RD(${address_space}'h`
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
          line += `\n\t\tAHB_RD(${address_space}'h`
          
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


    line += `\n\tend\n\nendmodule`

    fs.writeFile(Directory+'AHB_dummyMaster' + master_id + '.v', line, (err) => {    
        if (err) throw err; 
    }) 
  }, 

  ahb_master_instantiation: function(master_id){
   return `
\t//DUMMY MASTER #${master_id}
\tAHB_dummyMaster${master_id} AHB_dummyMaster_M${master_id}(
\t\t.HCLK(HCLK),
\t\t.HRESETn(HRESETn),

\t\t.HADDR(M${master_id}_HADDR),
\t\t.HWDATA(M${master_id}_HWDATA),
\t\t.HWRITE(M${master_id}_HWRITE),
\t\t.HTRANS(M${master_id}_HTRANS),
\t\t.HSIZE(M${master_id}_HSIZE),

\t\t.HREADY(M${master_id}_HREADY),
\t\t.HRDATA(M${master_id}_HRDATA),
\t\t.HPROT(M${master_id}_HPROT),
\t\t.HBURST(M${master_id}_HBURST),
\t\t.HBUSREQ(M${master_id}_HBUSREQ),
\t\t.HLOCK(M${master_id}_HLOCK),
\t\t.HGRANT(M${master_id}_HGRANT) 
\t);
`
  }
}