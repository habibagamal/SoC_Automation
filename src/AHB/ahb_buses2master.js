'use strict';
const IRQEN_OFF = "40";
const fs = require('fs');

module.exports ={
	ahb_buses2master_gen: function(masterID, buses, address_space, page_bits,Directory){
		var line = `\`timescale 1ns/1ns

module ahb_buses2master_${masterID} (
\tinput HCLK,
\tinput HRESETn,
 
\tinput [${address_space - 1}: 0] HADDR,
\tinput HWRITE,
\tinput HBUSREQ,
\tinput HGRANT,\n\n`

		for (var i = 0; i < buses.length; i++){
			line += `\tinput HGRANT_${buses[i].id},
\tinput HREADY_${buses[i].id},
\tinput [31: 0] HRDATA_${buses[i].id},\n`
		} 

	  line +=
	  `\toutput HREADY,
\toutput [31:0] HRDATA

);

\treg HREADY;
\treg [31:0] HRDATA;
  
\treg [${page_bits}:0] S_ADDR;
  
\talways @ (posedge HCLK or negedge HRESETn) begin 
\t\tif (~HRESETn) begin 
\t\t\tHREADY <= 1'b0;
\t\t\tHRDATA <= 32'b0;
\t\t\tS_ADDR <= ${page_bits}'b0;
\t\tend
\t\telse  begin
\t\t\tif (HBUSREQ && HGRANT) begin
\t\t\t\tS_ADDR <= HADDR[${address_space - 1}:${address_space - page_bits}];`

    	for (var i = 0; i < buses.length; i++){
    		var starting_page = parseInt(buses[i].starting_page, 16)
    		line += `\t\t\t\tif (HREADY_${buses[i].id} && HGRANT_${buses[i].id} && (S_ADDR >= 4'd${starting_page} && S_ADDR < 4'd${starting_page + buses[i].number_of_pages})) begin 
\t\t\t\t\tHREADY <= HREADY_${buses[i].id};
\t\t\t\t\tHRDATA <= HRDATA_${buses[i].id};
\t\t\t\tend 
\t\t\t\telse`
    	}

    	line += ` begin 
\t\t\t\t\tHREADY <= 1'b0;
\t\t\t\t\tHRDATA <= 32'b0;
\t\t\t\tend
\t\t\tend
\t\tend
\tend
endmodule`

		fs.writeFile(Directory+"AHB_buses2master" + masterID + ".v", line, (err) => {
            if (err)
                throw err; 
	    })
	},

	ahb_buses2master_instantiation: function(masterID, buses){
		var line = `ahb_buses2master_${masterID} ahb_buses2master_${masterID}_inst (
\t.HCLK(HCLK),
\t.HRESETn(HRESETn),
\t.HADDR(M${masterID}_HADDR),
\t.HWRITE(M${masterID}_HWRITE),
\t.HBUSREQ(M${masterID}_HBUSREQ),
\t.HGRANT(M${masterID}_HGRANT),`
for (var i = 0; i < buses.length; i++){
			line += `\n\t.HGRANT_${buses[i].id}(M${masterID}_HGRANT_Sys${buses[i].id}),
\t.HREADY_${buses[i].id}(HREADY_Sys${buses[i].id}),
\t.HRDATA_${buses[i].id}(HRDATA_Sys${buses[i].id}),\n`
		} 
line += `\t.HREADY(M${masterID}_HREADY),
\t.HRDATA(M${masterID}_HRDATA)
);`

	return line;
	}
}

