/*
    APB/AHB Wrapper generator
    M. Shalan, 2020
*/

'use strict';

const IRQEN_OFF = "40";
const PRESCALER_OFF = "30";

const fs = require('fs');

var utils = require("./utils/utils.js")

var codePathArr = process.argv[1].split("/")

if(codePathArr[codePathArr.length-1]  == "wrapper.js"){
    
    if(process.argv.length<4){
        console.log("use: node wrapper.js ip_json apb/ahb Optional-Output-Directory\n");
        process.exit(0);
    }

    let rawdata = fs.readFileSync(process.argv[2]);
    let ip = JSON.parse(rawdata);

    //Default address space is 32
    //Default page size is 4
    //Default sub_page size is 4
    //Default output Directory is ../Output/
    var Directory =(typeof process.argv[4]==='undefined')?`../Output/`:process.argv[4]
    try{fs.mkdirSync(Directory, { recursive: true })}
    catch(e){}
    
    if(process.argv[3] == "apb") apb_wrapper_gen(ip,32,4,4,Directory);
    else ahb_wrapper_gen(ip,32,4,4,Directory);
}

module.exports = {
    ahb_wrapper : function (ip, slave ,address_space, page_bits, subpage_bits,Directory){
        ahb_wrapper_gen(ip, slave ,address_space, page_bits, subpage_bits,Directory)
    }, 
    apb_wrapper:function(ip,slave, address_space, page_bits, subpage_bits,Directory) {
        apb_wrapper_gen(ip,slave, address_space, page_bits, subpage_bits,Directory)
    }
}


function ahb_wrapper_gen (ip, slave, address_space, page_bits, subpage_bits, Directory){
    var print = module_header_ahb(ip,slave, address_space, page_bits, subpage_bits);
    // Register definitions
    if (ip.externals != undefined)
        print += reg_def(ip,slave,ip.regs.concat(ip.externals));
    else 
        print += reg_def(ip,slave,ip.regs);
    print += wire_def(ip,slave, ip.regs);

    // Registers write
    for(var reg_index in ip.regs){
        var name = ip.regs[reg_index].port;
        var size = parseInt(utils.getSize(ip,slave,ip.regs[reg_index]));
        var offset = ip.regs[reg_index].offset;
        var initial_val = ip.regs[reg_index].initial_value;
        var dir = ip.regs[reg_index].access;
        var pulse = ip.regs[reg_index].access_pulse;
        if(dir == 0){       // Write Register
            print += ("\n\t// Register: " + ip.regs[reg_index].port);
            print += ("\n" + ahb_reg_write(name, size, offset, initial_val, address_space, page_bits, subpage_bits));
        }
        if(typeof pulse != "undefined"){
            if(dir==0) print += "\n\t// Write Pulse Generation\n";
            else print += "\n\t// Read Pulse Generation\n";
            print += `\treg ${pulse}, ${pulse}_p;\n`;
            let end_bit = (address_space - page_bits - subpage_bits - 1) 
            let start_bit = 2
            if(dir==1) print += `\twire ${name}_select = rd_enable & (HADDR[${end_bit}:${start_bit}] == ${end_bit - start_bit + 1}'h${offset});\n`
            print += "\n\talways@(posedge HCLK or negedge HRESETn)\n";
            print += `\tif(~HRESETn) ${pulse}_p <= 1'b0;\n`;
            print += `\telse ${pulse}_p <= ${name}_select;\n\n`;
            print += "\n\talways@(posedge HCLK or negedge HRESETn)\n";
            print += `\tif(~HRESETn) ${pulse} <= 1'b0;\n`;
            print += `\telse ${pulse} <= ${pulse}_p;\n\n`;
        }
    }

    // IRQ o/p
    if(typeof ip.irqs != "undefined"){

        print += (`\n\n\t// IRQ Enable Register @ offset 0x100`);
        print += (`\n\treg[${ip.irqs.length-1}:0] IRQEN;`)
        print += ("\n" + ahb_reg_write("IRQEN", ip.irqs.length, IRQEN_OFF, 0, address_space, page_bits, subpage_bits));

        var line = "";
        line += `\tassign IRQ = ( ${ip.irqs[0].reg}`
        if (ip.irqs[0].field != undefined)
            line += `_${ip.irqs[0].field} & IRQEN[0] ) `;
        else 
            line += ` & IRQEN[0] ) `;
        for(var irq_index in ip.irqs){
            if(irq_index != 0) 
                line += `| ( ${ip.irqs[irq_index].reg}_${ip.irqs[irq_index].field} & IRQEN[${irq_index}] ) `;
        }

        print += (`\n${line};\n`);

    }

    
    // Registers read
    print += (`\n    assign HRDATA = `);

    for(var reg_index in ip.regs){
        var name = ip.regs[reg_index].port;
        var offset = ip.regs[reg_index].offset;
        var size = parseInt(utils.getSize(ip,slave,ip.regs[reg_index]));
        print += 
        (`\n      `+ahb_reg_read(name, offset, size, address_space, page_bits, subpage_bits));    
    }
    if(typeof ip.irqs != "undefined")
        print += ("\n"+ahb_reg_read("IRQEN", IRQEN_OFF, ip.irqs.length, address_space, page_bits, subpage_bits));    



    print += (`\n\t32'hDEADBEEF;`);

    print += (`\n\tassign HREADYOUT = 1'b1;     // Always ready\n`);

    print += ("\nendmodule");

    var filename = Directory+"AHBlite_" + ip.name + ".v";
    fs.writeFile(filename, print, (err) => {
        if (err)
            throw err; 
    })
}

function apb_wrapper_gen(ip, slave ,address_space, page_bits, subpage_bits,Directory) {
    // module header (port definitions)
    var print = ""
    
    print += module_header_apb(ip, slave, address_space, page_bits, subpage_bits);

    // Register definitions
    if (ip.externals != undefined)
        print += reg_def(ip, slave, ip.regs.concat(ip.externals));
    else 
        print += reg_def(ip,slave, ip.regs);
    print += wire_def(ip,slave, ip.regs);

    // Registers write
    for(var reg_index in ip.regs){
        var name = ip.regs[reg_index].port;
        var size = parseInt(utils.getSize(ip,slave, ip.regs[reg_index]));
        var offset = ip.regs[reg_index].offset;
        var initial_val = ip.regs[reg_index].initial_value;
        var pulse = ip.regs[reg_index].access_pulse;
        var dir = ip.regs[reg_index].access;
        if(dir == 0){   // Write Register
            print += "\n\t// Register: "+ip.regs[reg_index].port;
            print += "\n" + apb_reg_write(name, size, offset, initial_val, address_space, page_bits, subpage_bits)
        }
        if(typeof pulse != "undefined"){
            if(dir==0) print += "\n\t// Write Pulse Generation\n";
            else print += "\n\t// Read Pulse Generation\n";
            print += `\treg ${pulse}, ${pulse}_p;\n`;
            let end_bit = (address_space - page_bits - subpage_bits - 1) 
            let start_bit = 2
            if(dir==1) print += `\twire ${name}_select = rd_enable & (PADDR[${end_bit}:${start_bit}] == ${end_bit - start_bit + 1}'h${offset});\n`
            print += "\n\talways@(posedge PCLK or negedge PRESETn)\n";
            print += `\tif(~PRESETn) ${pulse}_p <= 1'b0;\n`;
            print += `\telse ${pulse}_p <= ${name}_select;\n\n`;
            print += "\n\talways@(posedge PCLK or negedge PRESETn)\n";
            print += `\tif(~PRESETn) ${pulse} <= 1'b0;\n`;
            print += `\telse ${pulse} <= ${pulse}_p;\n\n`;
        }
    }

    // Prescaler
    if(typeof ip.prescaler != "undefined"){
        print += apb_prescaler(`${ip.prescaler.clk}`,ip.prescaler.size, PRESCALER_OFF, 0, address_space, page_bits, subpage_bits); 
    }

    // IRQ o/p
    if(typeof ip.irqs != "undefined"){

        print += `\n\n\t// IRQ Enable Register @ offset 0x100`
        print += `\n\treg[${ip.irqs.length-1}:0] IRQEN;`
        print += "\n" + apb_reg_write("IRQEN", ip.irqs.length, IRQEN_OFF, 0, address_space, page_bits, subpage_bits)

        var line = `\tassign IRQ = ( `;
        line += (ip.irqs[0].trig_level==0) ? "~" : "";
        line += `${ip.irqs[0].reg}`;
        if(typeof ip.irqs[0].field != "undefined"){
            line += `_${ip.irqs[0].field}` 
        }
        line += ` & IRQEN[0] ) `;
        
        for(var irq_index in ip.irqs){
            var inv = (ip.irqs[irq_index].trig_level==0) ? `~` : ``;
            var reg_field = (typeof ip.irqs[0].field != "undefined") ? "" : `_${ip.irqs[irq_index].field}`;
            if(irq_index != 0) 
                line += `| ( ${inv}${ip.irqs[irq_index].reg}${reg_field} & IRQEN[${irq_index}] ) `;
        }
        print += `\n${line};\n`
    }

    // Registers read
    print += "\n\tassign PRDATA = ";

    for(var reg_index in ip.regs){
        var name = ip.regs[reg_index].port;
        var offset = ip.regs[reg_index].offset;
        var size = parseInt(utils.getSize(ip,slave, ip.regs[reg_index]));

        print += "\n\t\t"+apb_reg_read(name, offset, size, address_space, page_bits, subpage_bits)
    }
    if(typeof ip.irqs != "undefined")
        print += "\n\t\t"+apb_reg_read("IRQEN", IRQEN_OFF, ip.irqs.length, address_space, page_bits, subpage_bits)
    print += "\n\t\t32'hDEADBEEF;"


    // endmodule
    print += "\n\nendmodule"

    var filename = Directory+"APB_" + ip.name + ".v";
    fs.writeFile(filename, print, (err) => {
        if (err)
            throw err; 
    })
}

function apb_reg_write(reg_name, reg_size, reg_off, reg_init, address_space, page_bits, subpage_bits) {
    let end_bit = (address_space - page_bits - subpage_bits - 1) 
    let start_bit = 2
    return `\twire ${reg_name}_select = wr_enable & (PADDR[${end_bit}:2] == ${end_bit - start_bit + 1}'h${reg_off});

    always @(posedge PCLK or negedge PRESETn)
    begin
        if (~PRESETn)
            ${reg_name} <= ${reg_size}'h${reg_init};
        else if (${reg_name}_select)
            ${reg_name} <= PWDATA;
    end
    `;
}

function ahb_reg_write(reg_name, reg_size, reg_off, reg_init, address_space, page_bits, subpage_bits) {
    let end_bit = (address_space - page_bits - subpage_bits - 1) 
    let start_bit = 2
    return `    wire ${reg_name}_select = wr_enable & (IOADDR[${end_bit}:2] == ${end_bit - start_bit - 1}'h${reg_off});
    
    always @(posedge HCLK or negedge HRESETn)
    begin
        if (~HRESETn)
            ${reg_name} <= ${reg_size}'h${reg_init};
        else if (${reg_name}_select)
            ${reg_name} <= HWDATA;
    end
    `;
}

function apb_reg_read(reg_name, reg_off, reg_size, address_space, page_bits, subpage_bits){
	let start_bit = 2
	let end_bit = (address_space - page_bits - subpage_bits - 1) 
	let offset_size = end_bit - start_bit + 1

    if (reg_size != 32) return `(PADDR[${end_bit}:${start_bit}] == ${offset_size}'h${reg_off}) ? {${32-reg_size}'d0,${reg_name}} : `;
    else return `(PADDR[${end_bit}:${start_bit}] == ${offset_size}'h${reg_off}) ? ${reg_name} : `;
}

function ahb_reg_read(reg_name, reg_off, reg_size, address_space, page_bits, subpage_bits){
	let start_bit = 2
	let end_bit = (address_space - page_bits - subpage_bits - 1) 
	let offset_size = end_bit - start_bit + 1

    if (reg_size != 32) return `\t(IOADDR[${end_bit}:${start_bit}] == ${offset_size}'h${reg_off}) ? {${32-reg_size}'d0,${reg_name}} : `;
    else return `\t(IOADDR[${end_bit}:${start_bit}] == ${offset_size}'h${reg_off}) ? ${reg_name} : `;
}

function reg_def(ip, slave,regs, externals){
    var print = ""; 
    for(var reg_index in regs){
        var r_name = regs[reg_index].port;
        var dir = regs[reg_index].access;   
        var size = parseInt(utils.getSize(ip,slave, regs[reg_index]));
        var fields = regs[reg_index].fields;
        if(dir==0) {
            print += (`\n\n    reg [${size-1}:0] ${r_name};`);
            if(typeof fields != "undefined"){
                for(var fld_index in fields) {
                    var to = parseInt(utils.getSize(ip,slave,fields[fld_index]))+fields[fld_index].offset-1;
                    var from = fields[fld_index].offset;
                    var f_name = fields[fld_index].name;
                    print += `\n    assign ${r_name}_${f_name} = ${r_name}[${to}: ${from}];`
                }
            }   
        }

    }
    print += "\n"
    return print; 
}

function wire_def(ip, slave, regs){
    var print = ""

    for(var reg_index in regs){
        var r_name = regs[reg_index].port;
        var fields = regs[reg_index].fields;
        var dir = regs[reg_index].access; 
        var size =  parseInt(utils.getSize(ip,slave, regs[reg_index]));
        if(dir==1) {
            if(typeof fields == "undefined"){
                print += (`\n    wire[${size-1}:0] ${r_name};`);
            } else {
                print += (`\n    wire[${size-1}:0] ${r_name};`);
                for(var fld_index in fields) {
                    var f_name = fields[fld_index].name;
                    var to = parseInt(utils.getSize(ip,slave,fields[fld_index]))+fields[fld_index].offset-1;
                    var from = fields[fld_index].offset;
                    print += (`\n    wire[${parseInt(utils.getSize(ip,slave,fields[fld_index]))-1}:0] ${r_name}_${f_name};`);
                    print += `\n    assign ${r_name}[${to}: ${from}]=${r_name}_${f_name} ;`
                }
            }
        }
    }
    print += "\n"
    return print; 
}

function module_header_ip(ip,slave){
    var regs = ip.regs;
    var lines = `\t// IP Interface`;
    if(typeof ip.irqs != "undefined"){
        lines += "\n\toutput\t\tIRQ,\n";
    }
    // Add support for prescaler
    if(typeof ip.prescaler != "undefined"){
        lines += `\n\n\t// Prescaled Clock\n\toutput reg\t${ip.prescaler.clk},\n\n`;
    }
    
    for(var reg_index in regs){
        var r_name = regs[reg_index].port;
        var fields = regs[reg_index].fields;
        var dir = regs[reg_index].access;
        var r_size = parseInt(utils.getSize(ip,slave,regs[reg_index]));
        lines += `\n\t// ${r_name} register/fields\n`;
        if(typeof fields != "undefined"){
            for(var fld_index in fields) {
                var port_dir = (dir==1) ? "input" : "output";
                var size = parseInt(utils.getSize(ip,slave,fields[fld_index]));
                var f_name = fields[fld_index].name;
                var offset = fields[fld_index].offset;
                var term = ((reg_index==(regs.length-1)) && (fld_index==(fields.length-1))) ? `\n` : `,\n`;
                lines = lines + `\t${port_dir} [${size-1}:0] ${r_name}_${f_name}${term}`;
            }
            lines += `\n`;
        } else {
            var term = ((reg_index==(regs.length-1))) ? `\n` : `,\n`;
            var port_dir = (dir==1) ? `input` : `output`;
            lines += `\t${port_dir} [${r_size-1}:0] ${r_name}${term}`;
            var pulse = regs[reg_index].access_pulse;
            if(typeof pulse != "undefined"){
                lines += `\toutput ${pulse}${term}`;
            }
            lines += "\n";
        }
    }
    return lines;
}

function module_header_apb(ip, slave ,address_space, page_bits, subpage_bits){
    var name = ip.name;
    let end_bit = address_space - page_bits - subpage_bits - 1
    return `/*
        APB Wrapper for ${ip.name} macro 
        Automatically generated from a JSON description by ${ip.Author.name}
        Generated at ` + date_time()+` 
*/

\`timescale 1ns/1ns
   
module APB_${name} (
\t// APB Interface
\t// clock and reset 
\tinput  wire        PCLK,    
\tinput  wire        PCLKG,   // Gated clock
\tinput  wire        PRESETn, // Reset

\t// input ports
\tinput  wire        PSEL,    // Select
\tinput  wire [${end_bit}:2] PADDR,   // Address
\tinput  wire        PENABLE, // Transfer control
\tinput  wire        PWRITE,  // Write control
\tinput  wire [31:0] PWDATA,  // Write data

\t// output ports
\toutput wire [31:0] PRDATA,  // Read data
\toutput wire        PREADY`+((ip.regs.length == 0)?`\n\t`:`,\n\t`)  +`// Device ready

` + module_header_ip(ip,slave) + `);
\twire rd_enable;
\twire wr_enable;
\tassign  rd_enable = PSEL & (~PWRITE); 
\tassign  wr_enable = PSEL & PWRITE & (PENABLE); 
\tassign  PREADY = 1'b1;
    `;
}

function module_header_ahb(ip, slave, address_space, page_bits, subpage_bits){
    var name = ip.name;

    let end_bit = address_space - page_bits - subpage_bits - 1

    return `\`timescale 1ns/1ns
    module AHBlite_${name} (
    // AHB Interface
    // clock and reset 
    input  wire        HCLK,    
    //input  wire        HCLKG,   // Gated clock
    input  wire        HRESETn, // Reset

    // input ports
    input   wire        HSEL,    // Select
    input   wire [${end_bit}:2] HADDR,   // Address
    input   wire        HREADY, // 
    input   wire        HWRITE,  // Write control
    input   wire [1:0]  HTRANS,    // AHB transfer type
    input   wire [2:0]  HSIZE,    // AHB hsize
    input   wire [31:0] HWDATA,  // Write data

    // output ports
    output wire [31:0] HRDATA,  // Read data
    output wire        HREADYOUT,  // Device ready
    output wire [1:0]   HRESP` 
    +((ip.regs.length == 0)?`\n\t`:`,\n\t`)
    + module_header_ip(ip,slave) + 
`
);
    reg         IOSEL;
    reg [${end_bit}:0]  IOADDR;
    reg         IOWRITE;    // I/O transfer direction
    reg [2:0]   IOSIZE;     // I/O transfer size
    reg         IOTRANS;

    // registered HSEL, update only if selected to reduce toggling
    always @(posedge HCLK or negedge HRESETn) begin
        if (~HRESETn)
            IOSEL <= 1'b0;
        else
            IOSEL <= HSEL & HREADY;
    end
    
    // registered address, update only if selected to reduce toggling
    always @(posedge HCLK or negedge HRESETn) begin
        if (~HRESETn)
            IOADDR <= ${end_bit + 1}'d0;
        else
            IOADDR <= HADDR[${end_bit}:0];
    end

    // Data phase write control
    always @(posedge HCLK or negedge HRESETn)
    begin
      if (~HRESETn)
        IOWRITE <= 1'b0;
      else
        IOWRITE <= HWRITE;
    end
  
    // registered hsize, update only if selected to reduce toggling
    always @(posedge HCLK or negedge HRESETn)
    begin
      if (~HRESETn)
        IOSIZE <= {3{1'b0}};
      else
        IOSIZE <= HSIZE[2:0];
    end
  
    // registered HTRANS, update only if selected to reduce toggling
    always @(posedge HCLK or negedge HRESETn)
    begin
      if (~HRESETn)
        IOTRANS <= 1'b0;
      else
        IOTRANS <= HTRANS[1];
    end
    
    wire rd_enable;
    assign  rd_enable = IOSEL & (~IOWRITE) & IOTRANS; 
    wire wr_enable = IOTRANS & IOWRITE & IOSEL;
    `;
}

// module.exports = {
//   ahb_wrapper
// };

function apb_prescaler(clk_name, pre_size, pre_off, pre_init, address_space, page_bits, subpage_bits) {
    let end_bit = (address_space - page_bits - subpage_bits - 1) 
    let start_bit = 2
    var print = "";
    print += `\n\t// ${pre_size}-bit prescaler\n`;
    print += `\treg [${pre_size-1}:0] ${clk_name}_PRE, ${clk_name}_CNTR;\n`;
    print += `\treg ${clk_name}_CNTR_EN;\n`;
    print += `\twire ${clk_name}_CNTR_EN_select = wr_enable & (PADDR[${end_bit}:2] == ${end_bit - start_bit + 1}'h${pre_off+1});\n`
    print += `\twire ${clk_name}_CNTR_zero = (${clk_name}_CNTR == ${pre_size}'h0);\n`
    print += apb_reg_write(`${clk_name}_PRE`,pre_size, pre_off, pre_init, address_space, page_bits, subpage_bits); 
    
    return `
    ${print}    
    always @(posedge PCLK or negedge PRESETn)
        if (~PRESETn)
            ${clk_name}_CNTR_EN <= 1'b0;
        else if(${clk_name}_CNTR_EN_select)
            ${clk_name}_CNTR_EN <= PWDATA[0];

    always @(posedge PCLK or negedge PRESETn)
    begin
        if (~PRESETn)
            ${clk_name}_CNTR <= ${pre_size}'h${pre_init};
        else if(${clk_name}_CNTR_EN)
            ${clk_name}_CNTR <= ${clk_name}_CNTR - ${pre_size}'h1;
    end

    always @(posedge PCLK or negedge PRESETn)
    begin
        if (~PRESETn)
            ${clk_name} <= 1'b0;
        else if (${clk_name}_CNTR_zero)
            ${clk_name} <= ~ ${clk_name};
    end

    `;
}


function date_time(){
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    return(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
}