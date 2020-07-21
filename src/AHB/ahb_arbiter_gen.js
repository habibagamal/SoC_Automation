'use strict';
const IRQEN_OFF = "40";
const fs = require('fs');



module.exports ={
    ahb_arbiter_gen :function (numberOfMasters, numberOfSlaves,Directory){
       var line = `
       \`timescale 1ns/1ns  
        module AHB_arbiter
            #(parameter NUMM=${numberOfMasters} // num of masters
                    , NUMS=${numberOfSlaves})// num of slaves
        (
            input   wire               HRESETn
            , input   wire               HCLK
            , input   wire [NUMM-1:0]    HBUSREQ // 0: highest priority
            , output  reg  [NUMM-1:0]    HGRANT={NUMM{1'b0}}
            , output  reg  [     3:0]    HMASTER=4'h0
            , input   wire [NUMM-1:0]    HLOCK
            , input   wire               HREADY
            , output  reg                HMASTLOCK=1'b0
            , input   wire [16*NUMS-1:0] HSPLIT
        );
        reg  [NUMM-1:0] hmask={NUMM{1'b0}}; // 1=mask-out
        wire [     3:0] id=encoder(HGRANT);
        localparam ST_READY='h0
                    , ST_STAY ='h1;
        reg state=ST_READY;
        always @ (posedge HCLK or negedge HRESETn) begin
        if (HRESETn==1'b0) begin
            HGRANT    <=  'h0;
            HMASTER   <= 4'h0;
            HMASTLOCK <= 1'b0;
            hmask     <=  'h0;
            state     <= ST_READY;
        end else if (HREADY==1'b1) begin
            HMASTER   <= id;
            HMASTLOCK <= HLOCK[id];
            case (state)
            ST_READY: begin
                if (HBUSREQ!=0) begin
                    HGRANT  <= priority(HBUSREQ);
                    hmask   <= 'h0;
                    state   <= ST_STAY;
                end
                end // ST_READY
            ST_STAY: begin
                if (HBUSREQ=='b0) begin
                    HGRANT <= 'h0;
                    hmask  <= 'h0;
                    state  <= ST_READY;
                end else if (HBUSREQ[id]==1'b0) begin
                    if ((HBUSREQ&~hmask)=='b0) begin
                        HGRANT <= priority(HBUSREQ);
                        hmask  <= 'h0;
                    end else begin
                        HGRANT    <= priority(HBUSREQ&~hmask);
                        hmask[id] <= 1'b1;
                    end
                end
                end // ST_STAY
            default: begin
                        HGRANT <= 'h0;
                        state  <= ST_READY;
                        end
            endcase
        end // if
        end // always
        function [NUMM-1:0] priority;
            input  [NUMM-1:0] req;
            reg    [15:0] val;
        begin
            casex ({{16-NUMM{1'b0}},req})
            16'bxxxx_xxxx_xxxx_xxx1: val = 'h0001;
            16'bxxxx_xxxx_xxxx_xx10: val = 'h0002;
            16'bxxxx_xxxx_xxxx_x100: val = 'h0004;
            16'bxxxx_xxxx_xxxx_1000: val = 'h0008;
            16'bxxxx_xxxx_xxx1_0000: val = 'h0010;
            16'bxxxx_xxxx_xx10_0000: val = 'h0020;
            16'bxxxx_xxxx_x100_0000: val = 'h0040;
            16'bxxxx_xxxx_1000_0000: val = 'h0080;
            16'bxxxx_xxx1_0000_0000: val = 'h0100;
            16'bxxxx_xx10_0000_0000: val = 'h0200;
            16'bxxxx_x100_0000_0000: val = 'h0400;
            16'bxxxx_1000_0000_0000: val = 'h0800;
            16'bxxx1_0000_0000_0000: val = 'h1000;
            16'bxx10_0000_0000_0000: val = 'h2000;
            16'bx100_0000_0000_0000: val = 'h4000;
            16'b1000_0000_0000_0000: val = 'h8000;
            default: val = 'h0000;
            endcase
            priority = val[NUMM-1:0];
        end
        endfunction // priority
        function [3:0] encoder;
            input  [NUMM-1:0] req;
        begin
            casex ({{16-NUMM{1'b0}},req})
            16'bxxxx_xxxx_xxxx_xxx1: encoder = 'h0;
            16'bxxxx_xxxx_xxxx_xx10: encoder = 'h1;
            16'bxxxx_xxxx_xxxx_x100: encoder = 'h2;
            16'bxxxx_xxxx_xxxx_1000: encoder = 'h3;
            16'bxxxx_xxxx_xxx1_0000: encoder = 'h4;
            16'bxxxx_xxxx_xx10_0000: encoder = 'h5;
            16'bxxxx_xxxx_x100_0000: encoder = 'h6;
            16'bxxxx_xxxx_1000_0000: encoder = 'h7;
            16'bxxxx_xxx1_0000_0000: encoder = 'h8;
            16'bxxxx_xx10_0000_0000: encoder = 'h9;
            16'bxxxx_x100_0000_0000: encoder = 'hA;
            16'bxxxx_1000_0000_0000: encoder = 'hB;
            16'bxxx1_0000_0000_0000: encoder = 'hC;
            16'bxx10_0000_0000_0000: encoder = 'hD;
            16'bx100_0000_0000_0000: encoder = 'hE;
            16'b1000_0000_0000_0000: encoder = 'hF;
            default: encoder = 'h0;
            endcase
        end
        endfunction // encoder
        \`ifdef RIGOR
        // synthesis translate_off
        integer idx, idy;
        always @ ( posedge HCLK or negedge HRESETn) begin
        if (HRESETn==1'b0) begin
        end else begin
            if (|HGRANT) begin
                idy = 0;
                for (idx=0; idx<NUMM; idx=idx+1) if (HGRANT[idx]) idy = idy + 1;
                if (idy>1) $display("%04d %m ERROR AHB arbitration more than one granted", $time);
            end
        end // if
        end // always
        // synthesis translate_on
        \`endif
        endmodule
        `

        fs.writeFile(Directory+'AHB_arbiter.v', line, (err) => {
            if (err)
                throw err; 
        })
    },

    ahb_arbiter_instantiation :function (bus){
        var NUMM = bus.masters.length;
        var NUMS = bus.slaves.length + bus.subsystems.length;
        let module_content = `
    
    //AHB_SYS${bus.id} arbiter instantiation

    AHB_arbiter #(.NUMM(${NUMM}),.NUMS(${NUMS}))
    u_ahb_arbiter_Sys${bus.id} (
         //   .HRESETn   (HRESETn_Sys${bus.id}    )
         // , .HCLK      (HCLK_Sys${bus.id}       )

           .HRESETn   (HRESETn    )
         , .HCLK      (HCLK       )

         , .HBUSREQ   ({`
         for(var master_index = bus.masters.length-1; master_index>=0;master_index--){
          module_content +=`M${bus.masters[master_index]}_HBUSREQ_Sys${bus.id}`+((master_index>0)?`,`:``)
        }
          module_content+=`})
         , .HGRANT    ({`
         
         for(var master_index = bus.masters.length-1; master_index>=0;master_index--){
          module_content +=`M${bus.masters[master_index]}_HGRANT_Sys${bus.id}`+((master_index>0)?`,`:``)
        }
         module_content+= `})
         , .HMASTER   (HMASTER_Sys${bus.id}  )
         , .HLOCK     ({`
         
         for(var master_index = bus.masters.length-1; master_index>=0;master_index--){
          module_content += `M${bus.masters[master_index]}_HLOCK`+((master_index>0)?`,`:``)
        }
        module_content+=  `})
         , .HREADY    (HREADY_Sys${bus.id}   )
         , .HMASTLOCK (S_HMASTLOCK_Sys${bus.id})
         , .HSPLIT    ({`     //Note that HSPLIT is not supported yet in our system
         
        for(var slave_index in bus.slaves){
          module_content += ((slave_index>0)?`,`:``)+`HSPLIT_Sys${bus.id}_S${slave_index}`
        }

        for(var subsystem_index in bus.subsystems){
          module_content += ((subsystem_index>0)?`,`:((bus.slaves.length>0)?`,`:``))+`HSPLIT_Sys${bus.id}_SS${subsystem_index}`
        }
        
        module_content+= `})
    );`

        return module_content; 

    }
};    