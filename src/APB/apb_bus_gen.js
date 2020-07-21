'use strict';
const IRQEN_OFF = "40";
const fs = require('fs');

/*
if(process.argv.length>3){
    console.log("use: node apb_bus_gen.js #_of_Address_space_bits_for_the_bridge/ Default is 4\n");
    process.exit(0);
}else if (process.argv.length == 3){
    addressSpace = process.argv[2]
}



apb_bus(addressSpace)
*/

module.exports ={
    apb_bus_gen :function (busID, subpage_bits,Directory){
        apb_bus(busID, subpage_bits,Directory)
    }
}

function apb_bus (busID, subpage_bits,Directory){

    var numberOfSlaves = (1<<subpage_bits);
   
    var line = `
\`timescale 1ns/1ns

module APB_BUS${busID} #(
    // Parameters to enable/disable ports
    `
    for(var i=0;i<numberOfSlaves;i++){
        line+=(i?`,`:``)+`
    parameter PORT${i}_ENABLE  = 1`
    }
    line+=`
    )


    (
    // --------------------------------------------------------------------------
    // Port Definitions
    // --------------------------------------------------------------------------
    //MODULE INPUTS
      input  wire  [${subpage_bits - 1}:0]  DEC_BITS,
      input  wire         PSEL,
          `;
    for(var i=0;i<numberOfSlaves;i++){
        line += `
    // Slave # ${i}
    output wire         PSEL_S${i},
    input wire          PREADY_S${i},
    input wire  [31:0]  PRDATA_S${i},
    input wire          PSLVERR_S${i},`;
    }
    line += `
    //MODULE OUTPUTS
    output wire         PREADY,
    output wire [31:0]  PRDATA,
    output wire         PSLVERR
);
 
    wire [${numberOfSlaves - 1}:0] en  = { `
        
    for(var i=numberOfSlaves-1;i>=0;i--){
        line += `
                        (PORT${i}_ENABLE  == 1)`+(i? `,`:`
                        };\n`)
    }

    line += `
    wire [${numberOfSlaves - 1}:0] dec  = { `
    
    for(var i=numberOfSlaves-1;i>=0;i--){
        line += `
                        (DEC_BITS  == ${subpage_bits}'d${i})`+(i? `,`:`
                        };\n`)
    }

    line += `

    // Setting PSEL `
    for(var i=0;i<numberOfSlaves;i++){
        line += `
    assign PSEL_S${i} = PSEL & dec[${i}] & en[${i}];`;
    }
    
    line += `

    // Setting PREADY

    assign PREADY = ~PSEL |`
    
    for(var i=0;i<numberOfSlaves;i++){
        line += (i? ` |`:``)+`
        ( dec[${i}] & ( PREADY_S${i} | en[${i}] ) )`;
    }    

    line += `;

    // Setting PSLVERR

    assign PSLVERR = `

    for(var i=0;i<numberOfSlaves;i++){
        line += (i? ` |
        `:``)+`( PSEL_S${i} & PSLVERR_S${i} )`;
    }    
   
   
    line += `;

    // Setting PRDATA

    assign PRDATA = `
    
    for(var i=0;i<numberOfSlaves;i++){
        line += (i? ` |
        `:``)+`( {32{PSEL_S${i}}} & PRDATA_S${i} )`;
    }    
    line += `;
    
endmodule
    `

    fs.writeFile(Directory+"APB_bus" + busID + ".v", line, (err) => {
        if (err)
            throw err; 
    })
} 