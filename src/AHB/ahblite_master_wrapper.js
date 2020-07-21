'use strict';
const IRQEN_OFF = "40";

const fs = require('fs');

module.exports = {
ahb_lite_master_wrapper_gen:function (master_prefix,Directory){
    var line = `
    \`timescale 1ns/1ns

    module ahb_lite_master_wrapper(
        input HCLK,
        input HRESETn, 
        input [1: 0] HTRANS,
        input  HREADY_from_bus,
        output reg HREADY_to_master,
        output reg HBUSREQ,
        input HGRANT
    );
    
        always @(posedge HCLK or negedge HRESETn) begin
            if (~HRESETn) begin
                HREADY_to_master <= 1'b0;
                HBUSREQ <= 1'b0;
                end
            else begin
                HBUSREQ <= (HTRANS == 2'b10);
                HREADY_to_master <= HREADY_from_bus & HGRANT;
            end
        end
    
    endmodule
    `
    fs.writeFile(Directory+'AHBlite_master_wrapper.v', line, (err) => {    
        if (err) throw err; 
    })
    }
}