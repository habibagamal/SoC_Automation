'use strict';
const IRQEN_OFF = "40";
const fs = require('fs');



module.exports ={
    ahb_masters_mul_gen :function (numberOfMasters, modulePrefix, address_space,Directory){
       var line = `
       \`timescale 1ns/1ns
       module ${modulePrefix}_ahb_masters_mul
       (
              input   wire          HRESETn
            , input   wire          HCLK
            , input   wire          HREADY
            , input   wire  [ 3:0]  HMASTER
            , output  reg   [${address_space-1}:0]  HADDR
            , output  reg   [ 3:0]  HPROT
            , output  reg   [ 1:0]  HTRANS
            , output  reg           HWRITE
            , output  reg   [ 2:0]  HSIZE
            , output  reg   [ 2:0]  HBURST
            , output  reg   [31:0]  HWDATA
            `
        for (var i =0;i< numberOfMasters;i++){
            line+=`
            , input   wire  [${address_space-1}:0]  HADDR${i}
            , input   wire  [ 3:0]  HPROT${i}
            , input   wire  [ 1:0]  HTRANS${i}
            , input   wire          HWRITE${i}
            , input   wire  [ 2:0]  HSIZE${i}
            , input   wire  [ 2:0]  HBURST${i}
            , input   wire  [31:0]  HWDATA${i}
            `
        }

        line+=`
       );
              reg [3:0] hmaster_delay=4'h0;
              always @ (posedge HCLK or negedge HRESETn) begin
                  if (HRESETn==1'b0) begin
                       hmaster_delay <= 4'b0;
                  end else begin
                       if (HREADY) begin
                          hmaster_delay <= HMASTER;
                       end
                  end
              end
              always @ (HMASTER `

        for (var i =0;i< numberOfMasters;i++){
            line+= `or HADDR${i} `
        }
        
        line+=`) begin
                  case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HADDR = HADDR${i};
                `
        }
        line+=`  
                default: HADDR = ~32'b0;
                endcase
            end
        always @ (HMASTER `
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HPROT${i} `
        }
            
        line+=  `) begin
                  case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HPROT = HPROT${i};
                `
        }
            line+=`
                default: HPROT = 4'b0;
                endcase
            end
        always @ (HMASTER `
                
               
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HTRANS${i} `
        }
            
        line+=  `) begin
                  case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HTRANS = HTRANS${i};
                `
        }
        
        line+= `
                default: HTRANS = 2'b0;
                endcase
            end
        always @ (HMASTER `
              
              
              
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HWRITE${i} `
        }
            
        line+=  `) begin
                    case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HWRITE = HWRITE${i};
                `
        }
        
        line+= `      
                  default: HWRITE = 1'b0;
                  endcase
               end
        always @ (HMASTER `
              
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HSIZE${i} `
        }
            
        line+=  `) begin
                    case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HSIZE = HSIZE${i};
                `
        }
        
        line+= `             
                default: HSIZE = 3'b0;
                endcase
            end
        always @ (HMASTER `
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HBURST${i} `
        }
            
        line+=  `) begin
                    case (HMASTER)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HBURST = HBURST${i};
                `
        }
        
        line+= `             
                    default: HBURST = 3'b0;
                endcase
            end
        always @ (hmaster_delay `
        
        for (var i =0;i< numberOfMasters;i++){
            line+= `or HWDATA${i} `
        }
            
        line+=  `) begin
                    case (hmaster_delay)
                `
        for (var i =0;i< numberOfMasters;i++){    
            line+=`4'h${i}: HWDATA = HWDATA${i};
                `
        }
        
        line+=`
                  default: HWDATA = 3'b0;
                  endcase
               end
       endmodule
       
        `

        fs.writeFile(Directory+modulePrefix+"_AHB_masters_mul.v", line, (err) => {
            if (err)
                throw err; 
        })
    },


    ahb_masters_mul_instantiation:function (bus){
        
        let module_content = ` 

        //AHB_SYS${bus.id} masters mul instantiation
      
        AHB_bus_${bus.id}_ahb_masters_mul u_ahb_masters_mul_Sys${bus.id} (
        //   .HRESETn  (HRESETn_Sys${bus.id}    )
        // , .HCLK     (HCLK_Sys${bus.id}       )

          .HRESETn  (HRESETn    )
        , .HCLK     (HCLK       )

        , .HREADY   (HREADY_Sys${bus.id}   )
        , .HMASTER  (HMASTER_Sys${bus.id}  )
        , .HADDR    (HADDR_Sys${bus.id}    )
        , .HPROT    (HPROT_Sys${bus.id}    )
        , .HTRANS   (HTRANS_Sys${bus.id}   )
        , .HWRITE   (HWRITE_Sys${bus.id}   )
        , .HSIZE    (HSIZE_Sys${bus.id}    )
        , .HBURST   (HBURST_Sys${bus.id}   )
        , .HWDATA   (HWDATA_Sys${bus.id}   )
        `
        for (var master_index in bus.masters){
          module_content+=`
          , .HADDR${master_index}   (M${bus.masters[master_index]}_HADDR  )
          , .HPROT${master_index}   (M${bus.masters[master_index]}_HPROT  )
          , .HTRANS${master_index}  (M${bus.masters[master_index]}_HTRANS )
          , .HWRITE${master_index}  (M${bus.masters[master_index]}_HWRITE )
          , .HSIZE${master_index}   (M${bus.masters[master_index]}_HSIZE  )
          , .HBURST${master_index}  (M${bus.masters[master_index]}_HBURST )
          , .HWDATA${master_index}  (M${bus.masters[master_index]}_HWDATA )
          `
        }
     module_content+=`);
       `
       return module_content
    }
};    