'use strict';
const IRQEN_OFF = "40";

const fs = require('fs');
let utils = require("../utils/utils.js")

module.exports = {
	
	apb_master_gen:function(subsystem, IPs_map, address_space, page_bits , page, Directory){
		var line = ""
	  	line += `
\`timescale 1ns/1ns

\`define BYTE  3'b000
\`define HWORD 3'b001
\`define WORD  3'b010

module APB_dummyMaster (
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

	    let subpage_bits = subsystem.subpage_bits;
	   	for(var slave_index in subsystem.slaves){

			// let subpage = subsystem.slaves[slave_index].subpage;
			let subpage = slave_index
		    let type = subsystem.slaves[slave_index].type;

		    var writeRegisters = new Array();
		    var readRegisters = new Array(); 
			if(IPs_map.get(type).regs != undefined){
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
					
					let offset = parseInt(writeRegisters[i])<<2;
					
				    let page_bit_count = page_bits/4 - page.length
					let offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length

		        	let subpage_bit_count = subpage_bits/4 - subpage.length

				    // write
				    line += `\n    AHB_WR(${address_space}'h`

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

			        // read
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
		      	
		      	//read
		      	let page_bit_count = page_bits/4 - page.length
				let offset_bit_count = (address_space - page_bits - subpage_bits)/4 - offset.toString(16).length

	        	let subpage_bit_count = subpage_bits/4 - subpage.length
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
		}

		line += `\n  end\n\nendmodule`

		fs.writeFile(Directory+'APB_dummyMaster.v', line, (err) => {    
		    if (err) throw err; 
		}) 
	},

	apb_tb_gen:function (subsystem, IPs_map, address_space, page_bits , page,Directory){
		this.apb_master_gen(subsystem, IPs_map, address_space, page_bits , page,Directory);

		var line = `\`timescale 1ns/1ns
module apb_sys${subsystem.id}_tb;

\n\t//General Inputs
\treg HCLK;
\treg HRESETn;
\treg HSEL;
\treg HREADY;

\t//Connected to Master
\twire [${address_space - 1}: 0] HADDR;
\twire [31: 0] HWDATA;
\twire HWRITE;
\twire [1: 0] HTRANS;
\twire [2:0] HSIZE;

\t//General Outputs
\twire HREADYOUT;
\twire [31: 0] HRDATA;`

let instLine = `\t//Instantiation of Unit Under Test
\tapb_sys_${subsystem.id} uut (
\t\t.HCLK(HCLK),
\t\t.HRESETn(HRESETn),
\t\t.HADDR(HADDR),
\t\t.HTRANS(HTRANS),
\t\t.HWRITE(HWRITE),
\t\t.HWDATA(HWDATA),
\t\t.HSEL(HSEL),
\t\t.HREADY(HREADY),
\t\t.HRDATA(HRDATA),
\t\t.HREADYOUT(HREADYOUT)
`

let initLine = `\n\n\talways #5 HCLK = ~HCLK;
  
\tinitial begin
\t\tHCLK = 0;
\t\tHRESETn = 0;
\t\tHSEL = 1;
\t\tHREADY = 1;
`

	for(var slave_index in subsystem.slaves){
        line += `\n\n`
        if(IPs_map.get(subsystem.slaves[slave_index].type) == undefined){
            fs.appendFile('Errors.txt', "Error in slave index: " + slave_index + " type:" + subsystem.slaves[slave_index].type, (err) => { 
      
                // In case of a error throw err. 
                if (err) throw err; 
            }) 
        }
        
		line+=`\t//Slave #` +slave_index;
		if(IPs_map.get(subsystem.slaves[slave_index].type).module_type != "hard"){
			for (var ext_typex in IPs_map.get(subsystem.slaves[slave_index].type).externals){
				var external = IPs_map.get(subsystem.slaves[slave_index].type).externals[ext_typex]
				line += `\n\t`+(external.input?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(subsystem.slaves[slave_index].type),subsystem.slaves[slave_index],external)) - 1}: 0] ${external.port}_S${slave_index};`
				instLine += `,\n\t\t.${external.port}_S${slave_index}(${external.port}_S${slave_index})`
				//initLine += external.input?`\n\t\t${external.port}_S${slave_index}=0;`:``
			}
		}else{
			//Hard Modules
			if ( IPs_map.get(subsystem.slaves[slave_index].type).regs != undefined){
				for (var reg_typex in IPs_map.get(subsystem.slaves[slave_index].type).regs){
					var reg = IPs_map.get(subsystem.slaves[slave_index].type).regs[reg_typex]
					if (reg.fields != undefined){
						for (var i = 0; i < reg.fields.length; i++){
							line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(subsystem.slaves[slave_index].type),subsystem.slaves[slave_index],reg.fields[i])) - 1}: 0] ${reg.port}_${reg.fields[i].name}_S${slave_index};`
							instLine += `,\n\t\t.${reg.port}_${reg.fields[i].name}_S${slave_index}(${reg.port}_${reg.fields[i].name}_S${slave_index})`
							//initLine += reg.access?`\n\t\t${reg.port}_${reg.fields[i].name}_S${slave_index}=0;`:``
						}
					} else {
						line += `\n\t`+(reg.access?`reg `:`wire ` )+ `[${parseInt(utils.getSize(IPs_map.get(subsystem.slaves[slave_index].type),subsystem.IPs_mapslaves[slave_index],reg)) - 1}: 0] ${reg.port}_S${slave_index};`
						instLine += `,\n\t\t.${reg.port}_S${slave_index}(${reg.port}_S${slave_index})`
						//initLine += reg.access?`\n\t\t${reg.port}_S${slave_index}=0;`:``
					}
				}	
			}	
		}
		if (IPs_map.get(subsystem.slaves[slave_index].type).irqs != undefined && 
        IPs_map.get(subsystem.slaves[slave_index].type).irqs.length > 0)
        {
            line += `\n\twire IRQ_S${slave_index};`
            instLine += `,\n\t.IRQ_S${slave_index}(_S${slave_index})`
            //initLine += `\n\t\tIRQ_S${slave_index}=0;`
        }

    }
	
	
    //master instantiation
    line += `
\n\t//APB Master Instantiation
\tAPB_dummyMaster M (
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
    line += `\n\n\t\t#10\n\t\tHRESETn = 1;\n\n\t\t//Start Here\n\t\t#100;\n\tend\n\nendmodule`
	
	fs.writeFile(Directory+'APB_sys' + subsystem.id + '_tb.v', line, (err) => {    
	    if (err) throw err; 
		})
	}

}

