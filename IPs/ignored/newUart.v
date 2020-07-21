//////////////////////////////////////////////////////////////////////
////                                                              ////
////  Tubo 8051 cores UART Interface Module                       ////
////                                                              ////
////  This file is part of the Turbo 8051 cores project           ////
////  http://www.opencores.org/cores/turbo8051/                   ////
////                                                              ////
////  Description                                                 ////
////  Turbo 8051 definitions.                                     ////
////                                                              ////
////  To Do:                                                      ////
////    nothing                                                   ////
////                                                              ////
////  Author(s):                                                  ////
////      - Dinesh Annayya, dinesha@opencores.org                 ////
////                                                              ////
//////////////////////////////////////////////////////////////////////
////                                                              ////
//// Copyright (C) 2000 Authors and OPENCORES.ORG                 ////
////                                                              ////
//// This source file may be used and distributed without         ////
//// restriction provided that this copyright statement is not    ////
//// removed from the file and that any derivative work contains  ////
//// the original copyright notice and the associated disclaimer. ////
////                                                              ////
//// This source file is free software; you can redistribute it   ////
//// and/or modify it under the terms of the GNU Lesser General   ////
//// Public License as published by the Free Software Foundation; ////
//// either version 2.1 of the License, or (at your option) any   ////
//// later version.                                               ////
////                                                              ////
//// This source is distributed in the hope that it will be       ////
//// useful, but WITHOUT ANY WARRANTY; without even the implied   ////
//// warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR      ////
//// PURPOSE.  See the GNU Lesser General Public License for more ////
//// details.                                                     ////
////                                                              ////
//// You should have received a copy of the GNU Lesser General    ////
//// Public License along with this source; if not, download it   ////
//// from http://www.opencores.org/lgpl.shtml                     ////
////                                                              ////
//////////////////////////////////////////////////////////////////////
module uart 

     (  
        line_reset_n ,
        line_clk_16x ,

        app_reset_n ,
        app_clk ,

        // Reg Bus Interface Signal
       // reg_be,
        reg_0,
        reg_1,
        reg_2,
        reg_3,
        reg_4,
        reg_5,
        reg_6,
        reg_7,
        reg_8,
        reg_9,
        reg_10,
        reg_11,
        reg_12,
        reg_13,
        reg_14,
        reg_15,
        u_uart_ctrl_be,
        // Outputs
        
       // Line Interface
        si,
        so

     );




parameter W  = 8'd8;
parameter DP = 8'd16;
parameter AW = (DP == 2)   ? 1 : 
	       (DP == 4)   ? 2 :
               (DP == 8)   ? 3 :
               (DP == 16)  ? 4 :
               (DP == 32)  ? 5 :
               (DP == 64)  ? 6 :
               (DP == 128) ? 7 :
               (DP == 256) ? 8 : 0;



input        line_reset_n         ; // line reset
input        line_clk_16x         ; // line clock

input        app_reset_n          ; // application reset
input        app_clk              ; // application clock

//---------------------------------
// Reg Bus Interface Signal
//---------------------------------
//input [3:0]       reg_be         ;

input [31:0]    reg_0;  // Software_Reg_0
output [31:0]    reg_1;  // Software-Reg_1
input [31:0]    reg_2;  // Software-Reg_2
input [31:0]    reg_3;  // Software-Reg_3
input [31:0]    reg_4;  // Software-Reg_4
input [31:0]    reg_5;  // Software-Reg_5
input [31:0]    reg_6;  // Software-Reg_6
input [31:0]    reg_7;  // Software-Reg_7
input [31:0]    reg_8;  // Software-Reg_8
input [31:0]    reg_9;  // Software-Reg_9
input [31:0]    reg_10; // Software-Reg_10
input [31:0]    reg_11; // Software-Reg_11
input [31:0]    reg_12; // Software-Reg_12
input [31:0]    reg_13; // Software-Reg_13
input [31:0]    reg_14; // Software-Reg_14
input [31:0]    reg_15; // Software-Reg_15
input [4:0] u_uart_ctrl_be;
// Outputs

// Line Interface
input         si                  ; // uart si
output        so                  ; // uart so

// Wire Declaration

wire [W-1: 0]   tx_fifo_rd_data;
wire [W-1: 0]   rx_fifo_wr_data;
wire [W-1: 0]   app_rxfifo_rddata;
wire [1  : 0]   error_ind;

// Wire 
wire         cfg_tx_enable        ; // Tx Enable
wire         cfg_rx_enable        ; // Rx Enable
wire         cfg_stop_bit         ; // 0 -> 1 Stop, 1 -> 2 Stop
wire   [1:0] cfg_pri_mod          ; // priority mode, 0 -> nop, 1 -> Even, 2 -> Odd

wire        frm_error_o          ; // framing error
wire        par_error_o          ; // par error
wire        rx_fifo_full_err_o   ; // rx fifo full error
wire        rx_fifo_wr_full      ;
wire        app_rxfifo_empty     ;


uart_cfg u_cfg (

             . mclk          (app_clk),
             . reset_n       (app_reset_n),

        // Reg Bus Interface Signal
           //  . reg_be        (reg_be),
             . reg_0         (reg_0),
             . reg_1         (reg_1),
             . reg_2         (reg_2),
             . reg_3         (reg_3),
             . reg_4         (reg_4),
             . reg_5         (reg_5),
             . reg_6         (reg_6),
             . reg_7         (reg_7),
             . reg_8         (reg_8),
             . reg_9         (reg_9),
             . reg_10        (reg_10),
             . reg_11        (reg_11),
             . reg_12        (reg_12),
             . reg_13        (reg_13),
             . reg_14        (reg_14),
             . reg_15        (reg_15),
             . u_uart_ctrl_be(u_uart_ctrl_be),
            // Outputs


       // configuration
            . cfg_tx_enable       (cfg_tx_enable),
            . cfg_rx_enable       (cfg_rx_enable),
            . cfg_stop_bit        (cfg_stop_bit),
            . cfg_pri_mod         (cfg_pri_mod),

            . frm_error_o         (frm_error_o),
            . par_error_o         (par_error_o),
            . rx_fifo_full_err_o  (rx_fifo_full_err_o)

        );





uart_txfsm u_txfsm (
               . reset_n           ( line_reset_n      ),
               . baud_clk_16x      ( line_clk_16x      ),

               . cfg_tx_enable     ( cfg_tx_enable     ),
               . cfg_stop_bit      ( cfg_stop_bit      ),
               . cfg_pri_mod       ( cfg_pri_mod       ),

       // FIFO control signal
               . fifo_empty        ( tx_fifo_rd_empty  ),
               . fifo_rd           ( tx_fifo_rd        ),
               . fifo_data         ( tx_fifo_rd_data   ),

          // Line Interface
               . so                ( so                )
          );


uart_rxfsm u_rxfsm (
               . reset_n           (  line_reset_n     ),
               . baud_clk_16x      (  line_clk_16x     ) ,

               . cfg_rx_enable     (  cfg_rx_enable    ),
               . cfg_stop_bit      (  cfg_stop_bit     ),
               . cfg_pri_mod       (  cfg_pri_mod      ),

               . error_ind         (  error_ind        ),

       // FIFO control signal
               .  fifo_aval        ( !rx_fifo_wr_full  ),
               .  fifo_wr          ( rx_fifo_wr        ),
               .  fifo_data        ( rx_fifo_wr_data   ),

          // Line Interface
               .  si               (si_ss              )
          );

async_fifo #(W,DP,0,0) u_rxfifo (                  
               .wr_clk             (line_clk_16x       ),
               .wr_reset_n         (line_reset_n       ),
               .wr_en              (rx_fifo_wr         ),
               .wr_data            (rx_fifo_wr_data    ),
               .full               (rx_fifo_wr_full    ), // sync'ed to wr_clk
               .wr_total_free_space(                   ),

               .rd_clk             (app_clk            ),
               .rd_reset_n         (app_reset_n        ),
               .rd_en              (!app_rxfifo_empty  ),
               .empty              (app_rxfifo_empty   ),  // sync'ed to rd_clk
               .rd_total_aval      (                   ),
               .rd_data            (app_rxfifo_rddata  )
                   );

async_fifo #(W,DP,0,0) u_txfifo  (
               .wr_clk             (app_clk            ),
               .wr_reset_n         (app_reset_n        ),
               .wr_en              (!app_rxfifo_empty  ),
               .wr_data            (app_rxfifo_rddata  ),
               .full               (                   ), // sync'ed to wr_clk
               .wr_total_free_space(                   ),

               .rd_clk             (line_clk_16x       ),
               .rd_reset_n         (line_reset_n       ),
               .rd_en              (tx_fifo_rd         ),
               .empty              (tx_fifo_rd_empty   ),  // sync'ed to rd_clk
               .rd_total_aval      (                   ),
               .rd_data            (tx_fifo_rd_data    )
                   );


double_sync_low   u_si_sync (
               . in_data           ( si                ),
               . out_clk           (line_clk_16x       ),
               . out_rst_n         (line_reset_n       ),
               . out_data          (si_ss              ) 
          );

wire   frm_error          = (error_ind == 2'b01);
wire   par_error          = (error_ind == 2'b10);
wire   rx_fifo_full_err   = (error_ind == 2'b11);

double_sync_low   u_frm_err (
               . in_data           ( frm_error        ),
               . out_clk           ( app_clk          ),
               . out_rst_n         ( app_reset_n      ),
               . out_data          ( frm_error_o      ) 
          );

double_sync_low   u_par_err (
               . in_data           ( par_error        ),
               . out_clk           ( app_clk          ),
               . out_rst_n         ( app_reset_n      ),
               . out_data          ( par_error_o      ) 
          );

double_sync_low   u_rxfifo_err (
               . in_data           ( rx_fifo_full_err ),
               . out_clk           ( app_clk          ),
               . out_rst_n         ( app_reset_n      ),
               . out_data          ( rx_fifo_full_err_o  ) 
          );


endmodule

module uart_cfg (

             mclk,
             reset_n,

        // Reg Bus Interface Signal
             //reg_be,
             reg_0,
             reg_1,
             reg_2,
             reg_3,
             reg_4,
             reg_5,
             reg_6,
             reg_7,
             reg_8,
             reg_9,
             reg_10,
             reg_11,
             reg_12,
             reg_13,
             reg_14,
             reg_15,
             u_uart_ctrl_be,
            // Outputs
            

       // configuration
            cfg_tx_enable,
            cfg_rx_enable,
            cfg_stop_bit ,
            cfg_pri_mod  ,

            frm_error_o,
            par_error_o,
            rx_fifo_full_err_o

        );



input         mclk;
input         reset_n;

       // configuration
output        cfg_tx_enable       ; // Tx Enable
output        cfg_rx_enable       ; // Rx Enable
output        cfg_stop_bit        ; // 0 -> 1 Stop, 1 -> 2 Stop
output  [1:0] cfg_pri_mod         ; // priority mode, 0 -> nop, 1 -> Even, 2 -> Odd

input         frm_error_o         ; // framing error
input         par_error_o         ; // par error
input         rx_fifo_full_err_o  ; // rx fifo full error

//---------------------------------
// Reg Bus Interface Signal
//---------------------------------
input [31:0]    reg_0;  // Software_Reg_0
output [31:0]    reg_1;  // Software-Reg_1
input [31:0]    reg_2;  // Software-Reg_2
input [31:0]    reg_3;  // Software-Reg_3
input [31:0]    reg_4;  // Software-Reg_4
input [31:0]    reg_5;  // Software-Reg_5
input [31:0]    reg_6;  // Software-Reg_6
input [31:0]    reg_7;  // Software-Reg_7
input [31:0]    reg_8;  // Software-Reg_8
input [31:0]    reg_9;  // Software-Reg_9
input [31:0]    reg_10; // Software-Reg_10
input [31:0]    reg_11; // Software-Reg_11
input [31:0]    reg_12; // Software-Reg_12
input [31:0]    reg_13; // Software-Reg_13
input [31:0]    reg_14; // Software-Reg_14
input [31:0]    reg_15; // Software-Reg_15
input [4:0]     u_uart_ctrl_be;
//input [3:0]       reg_be         ;

// Outputs



//-----------------------------------------------------------------------
// Internal Wire Declarations
//-----------------------------------------------------------------------

//wire  [3:0]    wr_be   ;

wire [31:0]    reg_0;  // Software_Reg_0
wire [31:0]    reg_1;  // Software-Reg_1
wire [31:0]    reg_2;  // Software-Reg_2
wire [31:0]    reg_3;  // Software-Reg_3
wire [31:0]    reg_4;  // Software-Reg_4
wire [31:0]    reg_5;  // Software-Reg_5
wire [31:0]    reg_6;  // Software-Reg_6
wire [31:0]    reg_7;  // Software-Reg_7
wire [31:0]    reg_8;  // Software-Reg_8
wire [31:0]    reg_9;  // Software-Reg_9
wire [31:0]    reg_10; // Software-Reg_10
wire [31:0]    reg_11; // Software-Reg_11
wire [31:0]    reg_12; // Software-Reg_12
wire [31:0]    reg_13; // Software-Reg_13
wire [31:0]    reg_14; // Software-Reg_14
wire [31:0]    reg_15; // Software-Reg_15

//-----------------------------------------------------------------------
// Main code starts here
//-----------------------------------------------------------------------

//-----------------------------------------------------------------------
// Internal Logic Starts here
//-----------------------------------------------------------------------
 //   assign wr_be         = reg_be;


//-----------------------------------------------------------------------
// Read path mux
//-----------------------------------------------------------------------




//-----------------------------------------------------------------------
// register read enable and write enable decoding logic
//-----------------------------------------------------------------------


//-----------------------------------------------------------------------
// Individual register assignments
//-----------------------------------------------------------------------
// Logic for Register 0 : uart Control Register
//-----------------------------------------------------------------------
wire [1:0]   cfg_pri_mod     = reg_0[4:3]; // priority mode, 0 -> nop, 1 -> Even, 2 -> Odd
wire         cfg_stop_bit    = reg_0[2];   // 0 -> 1 Stop, 1 -> 2 Stop
wire         cfg_rx_enable   = reg_0[1];   // Rx Enable
wire         cfg_tx_enable   = reg_0[0];   // Tx Enable



//-----------------------------------------------------------------------
// Logic for Register 1 : uart interrupt status
//-----------------------------------------------------------------------
//Here it requires bus signals, this is somesort of a control register but what to do with it?
stat_register u_intr_bit0 (
		 //inputs
		 . clk        (mclk            ),
		 . reset_n    (reset_n         ),
		 . cpu_we     (sw_wr_en_1 /*&wr_be[0]*/        ),		 
		 . cpu_ack    (u_uart_ctrl_be[0]    ),
		 . hware_req  (frm_error_o     ),
		 
		 //outputs
		 . data_out   (reg_1[0]        )
		 );

stat_register u_intr_bit1 (
		 //inputs
		 . clk        (mclk            ),
		 . reset_n    (reset_n         ),
		 . cpu_we     (sw_wr_en_1 /*&wr_be[0]*/        ),		 
		 . cpu_ack    (u_uart_ctrl_be[1]    ),
		 . hware_req  (par_error_o     ),
		 
		 //outputs
		 . data_out   (reg_1[1]        )
		 );

stat_register u_intr_bit2 (
		 //inputs
		 . clk        (mclk                ),
		 . reset_n    (reset_n             ),
		 . cpu_we     (sw_wr_en_1 /*&wr_be[0]*/            ),		 
		 . cpu_ack    (u_uart_ctrl_be[2]        ),
		 . hware_req  (rx_fifo_full_err_o  ),
		 
		 //outputs
		 . data_out   (reg_1[2]            )
		 );




endmodule

// UART rx state machine

module uart_rxfsm (
             reset_n        ,
             baud_clk_16x   ,

             cfg_rx_enable  ,
             cfg_stop_bit   ,
             cfg_pri_mod    ,

             error_ind      ,

       // FIFO control signal
             fifo_aval      ,
             fifo_wr        ,
             fifo_data      ,

          // Line Interface
             si  
          );


input             reset_n        ; // active low reset signal
input             baud_clk_16x   ; // baud clock-16x

input             cfg_rx_enable  ; // transmit interface enable
input             cfg_stop_bit   ; // stop bit 
                                   // 0 --> 1 stop, 1 --> 2 Stop
input   [1:0]     cfg_pri_mod    ;// Priority Mode
                                   // 2'b00 --> None
                                   // 2'b10 --> Even priority
                                   // 2'b11 --> Odd priority

output [1:0]      error_ind     ; // 2'b00 --> Normal
                                  // 2'b01 --> framing error
                                  // 2'b10 --> parity error
                                  // 2'b11 --> fifo full
//--------------------------------------
//   FIFO control signal
//--------------------------------------
input             fifo_aval      ; // fifo empty
output            fifo_wr        ; // fifo write, assumed no back to back write
output  [7:0]     fifo_data      ; // fifo write data

// Line Interface
input             si             ;  // rxd pin



reg     [7:0]    fifo_data       ; // fifo write data
reg              fifo_wr         ; // fifo write 
reg    [1:0]     error_ind       ; 
reg    [2:0]     cnt             ;
reg    [3:0]     offset          ; // free-running counter from 0 - 15
reg    [3:0]     rxpos           ; // stable rx position
reg    [2:0]     rxstate         ;


parameter idle_st      = 3'b000;
parameter xfr_start    = 3'b001;
parameter xfr_data_st  = 3'b010;
parameter xfr_pri_st   = 3'b011;
parameter xfr_stop_st1 = 3'b100;
parameter xfr_stop_st2 = 3'b101;


always @(negedge reset_n or posedge baud_clk_16x) begin
   if(reset_n == 0) begin
      rxstate   <= 3'b0;
      offset    <= 4'b0;
      rxpos     <= 4'b0;
      cnt       <= 3'b0;
      error_ind <= 2'b0;
      fifo_wr   <= 1'b0;
      fifo_data <= 8'h0;
   end
   else begin
      offset     <= offset + 1;
      case(rxstate)
       idle_st   : begin
            if(!si) begin // Start indication
               if(fifo_aval && cfg_rx_enable) begin
                 rxstate   <=   xfr_start;
                 cnt       <=   0;
                 rxpos     <=   offset + 8; // Assign center rxoffset
                 error_ind <= 2'b00;
               end
               else begin
                  error_ind <= 2'b11; // fifo full error indication
               end
            end else begin
               error_ind <= 2'b00; // Reset Error
            end
         end
      xfr_start : begin
            // Make Sure that minimum 8 cycle low is detected
            if(cnt < 7 && si) begin // Start indication
               rxstate <=   idle_st;
            end
            else if(cnt == 7 && !si) begin // Start indication
                rxstate <=   xfr_data_st;
                cnt     <=   0;
            end else begin
              cnt  <= cnt +1;
            end
         end
      xfr_data_st : begin
             if(rxpos == offset) begin
                fifo_data[cnt] <= si;
                cnt            <= cnt+1;
                if(cnt == 7) begin
                   fifo_wr <= 1;
                   if(cfg_pri_mod == 2'b00)  // No Priority
                       rxstate <=   xfr_stop_st1;
                   else rxstate <= xfr_pri_st;  
                end
             end
          end
       xfr_pri_st   : begin
            fifo_wr <= 0;
            if(rxpos == offset) begin
               if(cfg_pri_mod == 2'b10)  // even priority
                  if( si != ^fifo_data) error_ind <= 2'b10;
               else  // Odd Priority
                  if( si != ~(^fifo_data)) error_ind <= 2'b10;
               rxstate <=   xfr_stop_st1;
            end
         end
       xfr_stop_st1  : begin
          fifo_wr <= 0;
          if(rxpos == offset) begin
             if(si) begin
               if(cfg_stop_bit) // Two Stop bit
                  rxstate <=   xfr_stop_st2;
               else   
                  rxstate <=   idle_st;
             end else begin // Framing error
                error_ind <= 2'b01;
                rxstate   <=   idle_st;
             end
          end
       end
       xfr_stop_st2  : begin
          if(rxpos == offset) begin
             if(si) begin
                rxstate <=   idle_st;
             end else begin // Framing error
                error_ind <= 2'b01;
                rxstate   <=   idle_st;
             end
          end
       end
    endcase
   end
end


endmodule

// UART tx state machine

module uart_txfsm (
             reset_n        ,
             baud_clk_16x   ,

             cfg_tx_enable  ,
             cfg_stop_bit   ,
             cfg_pri_mod    ,

       // FIFO control signal
             fifo_empty     ,
             fifo_rd        ,
             fifo_data      ,

          // Line Interface
             so  
          );


input             reset_n        ; // active low reset signal
input             baud_clk_16x   ; // baud clock-16x

input             cfg_tx_enable  ; // transmit interface enable
input             cfg_stop_bit   ; // stop bit 
                                   // 0 --> 1 stop, 1 --> 2 Stop
input   [1:0]     cfg_pri_mod    ;// Priority Mode
                                   // 2'b00 --> None
                                   // 2'b10 --> Even priority
                                   // 2'b11 --> Odd priority

//--------------------------------------
//   FIFO control signal
//--------------------------------------
input             fifo_empty     ; // fifo empty
output            fifo_rd        ; // fifo read, assumed no back to back read
input  [7:0]      fifo_data      ; // fifo read data

// Line Interface
output            so             ;  // txd pin


reg  [2:0]         txstate       ; // tx state
reg                so            ; // txd pin
reg  [7:0]         txdata        ; // local txdata
reg                fifo_rd       ; // Fifo read enable
reg  [2:0]         cnt           ; // local data cont
reg  [3:0]         divcnt        ; // clock div count

parameter idle_st      = 3'b000;
parameter xfr_data_st  = 3'b001;
parameter xfr_pri_st   = 3'b010;
parameter xfr_stop_st1 = 3'b011;
parameter xfr_stop_st2 = 3'b100;


always @(negedge reset_n or posedge baud_clk_16x)
begin
   if(reset_n == 1'b0) begin
      txstate  <= idle_st;
      so       <= 1'b1;
      cnt      <= 3'b0;
      txdata   <= 8'h0;
      fifo_rd  <= 1'b0;
      divcnt   <= 4'b0;
   end
   else begin
      divcnt <= divcnt+1;
      if(divcnt == 4'b0000) begin // Do at once in 16 clock
         case(txstate)
          idle_st      : begin
               if(!fifo_empty && cfg_tx_enable) begin
                  so       <= 1'b0 ; // Start bit
                  cnt      <= 3'b0;
                  fifo_rd  <= 1'b1;
                  txdata   <= fifo_data;
                  txstate  <= xfr_data_st;  
               end
            end

          xfr_data_st  : begin
              fifo_rd  <= 1'b0;
              so   <= txdata[cnt];
              cnt  <= cnt+1;
              if(cnt == 7) begin
                 if(cfg_pri_mod == 2'b00) begin // No Priority
                    txstate  <= xfr_stop_st1;  
                 end
                 else begin
                    txstate <= xfr_pri_st;  
                 end
              end
           end

          xfr_pri_st   : begin
               if(cfg_pri_mod == 2'b10)  // even priority
                   so <= ^txdata;
               else begin // Odd Priority
                   so <= ~(^txdata);
               end
               txstate  <= xfr_stop_st1;  
            end

          xfr_stop_st1  : begin // First Stop Bit
               so <= 1;
               if(cfg_stop_bit == 0)  // 1 Stop Bit
                    txstate <= idle_st;
               else // 2 Stop Bit 
                  txstate  <= xfr_stop_st2;
            end

          xfr_stop_st2  : begin // Second Stop Bit
               so <= 1;
               txstate <= idle_st;
            end
         endcase
      end
     else begin
        fifo_rd  <= 1'b0;
     end
   end
end


endmodule


 /***********************************************************************/
module stat_register (
		 //inputs
		 clk,
		 reset_n,
		 cpu_we,		 
		 cpu_ack,
		 hware_req,
		 
		 //outputs
		 data_out
		 );

//---------------------------------
// Reset Default value
//---------------------------------
parameter  RESET_DEFAULT = 1'h0;

  input	 clk      ;
  input	 reset_n  ;
  input	 cpu_we   ; // cpu write enable
  input	 cpu_ack  ; // CPU Ack
  input	 hware_req; // Hardware Req
  output data_out ;
  
  reg	 data_out;
  
  //infer the register
  always @(posedge clk or negedge reset_n)
    begin
      if (!reset_n)
	data_out <= RESET_DEFAULT;
      else if (hware_req)  // Set the flag on Hardware Req
	 data_out <= 1'b1;
      else if (cpu_we & cpu_ack) // Clear on CPU Ack
	 data_out <= 1'b0;
    end // always @ (posedge clk or negedge reset_n)
endmodule // register





/*********************************************************************
** copyright message here.
** module: generic register
***********************************************************************/
module  generic_register	(
	      //List of Inputs
	      we,		 
	      data_in,
	      reset_n,
	      clk,
	      
	      //List of Outs
	      data_out
	      );

  parameter   WD               = 1;  
  parameter   RESET_DEFAULT    = 0;  
  input [WD-1:0]     we;	
  input [WD-1:0]     data_in;	
  input              reset_n;
  input		     clk;
  output [WD-1:0]    data_out;


generate
  genvar i;
  for (i = 0; i < WD; i = i + 1) begin : gen_bit_reg
    bit_register #(RESET_DEFAULT[i]) u_bit_reg (   
                .we         (we[i]),
                .clk        (clk),
                .reset_n    (reset_n),
                .data_in    (data_in[i]),
                .data_out   (data_out[i])
            );
  end
endgenerate


endmodule

//-------------------------------------------
// async_fifo:: async FIFO
//    Following two ports are newly added
//        1. At write clock domain:
//           wr_total_free_space -->  Indicate total free transfer available 
//        2. At read clock domain:
//           rd_total_aval       -->  Indicate total no of transfer available
//-----------------------------------------------
`timescale  1ns/1ps

module async_fifo (wr_clk,
                   wr_reset_n,
                   wr_en,
                   wr_data,
                   full,                 // sync'ed to wr_clk
                   afull,                 // sync'ed to wr_clk
                   wr_total_free_space,
                   rd_clk,
                   rd_reset_n,
                   rd_en,
                   empty,                // sync'ed to rd_clk
                   aempty,                // sync'ed to rd_clk
                   rd_total_aval,
                   rd_data);

   parameter W = 4'd8;
   parameter DP = 3'd4;
   parameter WR_FAST = 1'b1;
   parameter RD_FAST = 1'b1;
   parameter FULL_DP = DP;
   parameter EMPTY_DP = 1'b0;

   parameter AW = (DP == 2)   ? 1 : 
		  (DP == 4)   ? 2 :
                  (DP == 8)   ? 3 :
                  (DP == 16)  ? 4 :
                  (DP == 32)  ? 5 :
                  (DP == 64)  ? 6 :
                  (DP == 128) ? 7 :
                  (DP == 256) ? 8 : 0;

   output [W-1 : 0]  rd_data;
   input [W-1 : 0]   wr_data;
   input             wr_clk, wr_reset_n, wr_en, rd_clk, rd_reset_n,
                     rd_en;
   output            full, empty;
   output            afull, aempty; // about full and about to empty
   output   [AW:0]   wr_total_free_space; // Total Number of free space aval 
                                               // w.r.t write clk
                                               // note: Without accounting byte enables
   output   [AW:0]   rd_total_aval;       // Total Number of words avaialble 
                                               // w.r.t rd clock, 
                                              // note: Without accounting byte enables
   // synopsys translate_off

   initial begin
      if (AW == 0) begin
         $display ("%m : ERROR!!! Fifo depth %d not in range 2 to 256", DP);
      end // if (AW == 0)
   end // initial begin

   // synopsys translate_on
   reg [W-1 : 0]    mem[DP-1 : 0];

   /*********************** write side ************************/
   reg [AW:0] sync_rd_ptr_0, sync_rd_ptr_1; 
   wire [AW:0] sync_rd_ptr;
   reg [AW:0] wr_ptr, grey_wr_ptr;
   reg [AW:0] grey_rd_ptr;
   reg full_q;
   wire full_c;
   wire afull_c;
   wire [AW:0] wr_ptr_inc = wr_ptr + 1'b1;
   wire [AW:0] wr_cnt = get_cnt(wr_ptr, sync_rd_ptr);

   assign full_c  = (wr_cnt == FULL_DP) ? 1'b1 : 1'b0;
   assign afull_c = (wr_cnt == FULL_DP-1) ? 1'b1 : 1'b0;

   //--------------------------
   // Shows total number of words 
   // of free space available w.r.t write clock
   //--------------------------- 
   assign wr_total_free_space = FULL_DP - wr_cnt;

   always @(posedge wr_clk or negedge wr_reset_n) begin
	if (!wr_reset_n) begin
		wr_ptr <= 0;
		grey_wr_ptr <= 0;
		full_q <= 0;	
	end
	else if (wr_en) begin
		wr_ptr <= wr_ptr_inc;
		grey_wr_ptr <= bin2grey(wr_ptr_inc);
		if (wr_cnt == (FULL_DP-1)) begin
			full_q <= 1'b1;
		end
	end
	else begin
	    	if (full_q && (wr_cnt<FULL_DP)) begin
			full_q <= 1'b0;
	     	end
	end
    end

    assign full  = (WR_FAST == 1) ? full_c : full_q;
    assign afull = afull_c;

    always @(posedge wr_clk) begin
	if (wr_en) begin
		mem[wr_ptr[AW-1:0]] <= wr_data;
	end
    end

    wire [AW:0] grey_rd_ptr_dly ;
    assign #1 grey_rd_ptr_dly = grey_rd_ptr;

    // read pointer synchronizer
    always @(posedge wr_clk or negedge wr_reset_n) begin
	if (!wr_reset_n) begin
		sync_rd_ptr_0 <= 0;
		sync_rd_ptr_1 <= 0;
	end
	else begin
		sync_rd_ptr_0 <= grey_rd_ptr_dly;		
		sync_rd_ptr_1 <= sync_rd_ptr_0;
	end
    end

    assign sync_rd_ptr = grey2bin(sync_rd_ptr_1);

   /************************ read side *****************************/
   reg [AW:0] sync_wr_ptr_0, sync_wr_ptr_1; 
   wire [AW:0] sync_wr_ptr;
   reg [AW:0] rd_ptr;
   reg empty_q;
   wire empty_c;
   wire aempty_c;
   wire [AW:0] rd_ptr_inc = rd_ptr + 1'b1;
   wire [AW:0] sync_wr_ptr_dec = sync_wr_ptr - 1'b1;
   wire [AW:0] rd_cnt = get_cnt(sync_wr_ptr, rd_ptr);
 
   assign empty_c  = (rd_cnt == 0) ? 1'b1 : 1'b0;
   assign aempty_c = (rd_cnt == 1) ? 1'b1 : 1'b0;
   //--------------------------
   // Shows total number of words 
   // space available w.r.t write clock
   //--------------------------- 
   assign rd_total_aval = rd_cnt;

   always @(posedge rd_clk or negedge rd_reset_n) begin
	if (!rd_reset_n) begin
		rd_ptr <= 0;
		grey_rd_ptr <= 0;
		empty_q <= 1'b1;
	end
	else begin
		if (rd_en) begin
			rd_ptr <= rd_ptr_inc;
			grey_rd_ptr <= bin2grey(rd_ptr_inc);
			if (rd_cnt==(EMPTY_DP+1)) begin
				empty_q <= 1'b1;
			end
		end
		else begin
			if (empty_q && (rd_cnt!=EMPTY_DP)) begin
				empty_q <= 1'b0;
			end
		end
	end
    end

    assign empty  = (RD_FAST == 1) ? empty_c : empty_q;
    assign aempty = aempty_c;

    assign rd_data = mem[rd_ptr[AW-1:0]];

    wire [AW:0] grey_wr_ptr_dly ;
    assign #1 grey_wr_ptr_dly =  grey_wr_ptr;

    // write pointer synchronizer
    always @(posedge rd_clk or negedge rd_reset_n) begin
	if (!rd_reset_n) begin
		sync_wr_ptr_0 <= 0;
		sync_wr_ptr_1 <= 0;
	end
	else begin
		sync_wr_ptr_0 <= grey_wr_ptr_dly;		
		sync_wr_ptr_1 <= sync_wr_ptr_0;
	end
    end
    assign sync_wr_ptr = grey2bin(sync_wr_ptr_1);

	
/************************ functions ******************************/
function [AW:0] bin2grey;
input [AW:0] bin;
reg [8:0] bin_8;
reg [8:0] grey_8;
begin
	bin_8 = bin;
	grey_8[1:0] = do_grey(bin_8[2:0]);
	grey_8[3:2] = do_grey(bin_8[4:2]);
	grey_8[5:4] = do_grey(bin_8[6:4]);
	grey_8[7:6] = do_grey(bin_8[8:6]);
	grey_8[8] = bin_8[8];
	bin2grey = grey_8;
end
endfunction

function [AW:0] grey2bin;
input [AW:0] grey;
reg [8:0] grey_8;
reg [8:0] bin_8;
begin
	grey_8 = grey;
	bin_8[8] = grey_8[8];
	bin_8[7:6] = do_bin({bin_8[8], grey_8[7:6]});
	bin_8[5:4] = do_bin({bin_8[6], grey_8[5:4]});
	bin_8[3:2] = do_bin({bin_8[4], grey_8[3:2]});
	bin_8[1:0] = do_bin({bin_8[2], grey_8[1:0]});
	grey2bin = bin_8;
end
endfunction


function [1:0] do_grey;
input [2:0] bin;
begin
	if (bin[2]) begin  // do reverse grey
		case (bin[1:0]) 
			2'b00: do_grey = 2'b10;
			2'b01: do_grey = 2'b11;
			2'b10: do_grey = 2'b01;
			2'b11: do_grey = 2'b00;
		endcase
	end
	else begin
		case (bin[1:0]) 
			2'b00: do_grey = 2'b00;
			2'b01: do_grey = 2'b01;
			2'b10: do_grey = 2'b11;
			2'b11: do_grey = 2'b10;
		endcase
	end
end
endfunction

function [1:0] do_bin;
input [2:0] grey;
begin
	if (grey[2]) begin	// actually bin[2]
		case (grey[1:0])
			2'b10: do_bin = 2'b00;
			2'b11: do_bin = 2'b01;
			2'b01: do_bin = 2'b10;
			2'b00: do_bin = 2'b11;
		endcase
	end
	else begin
		case (grey[1:0])
			2'b00: do_bin = 2'b00;
			2'b01: do_bin = 2'b01;
			2'b11: do_bin = 2'b10;
			2'b10: do_bin = 2'b11;
		endcase
	end
end
endfunction
			
function [AW:0] get_cnt;
input [AW:0] wr_ptr, rd_ptr;
begin
	if (wr_ptr >= rd_ptr) begin
		get_cnt = (wr_ptr - rd_ptr);	
	end
	else begin
		get_cnt = DP*2 - (rd_ptr - wr_ptr);
	end
end
endfunction

// synopsys translate_off
always @(posedge wr_clk) begin
   if (wr_en && full) begin
      $display($time, "%m Error! afifo overflow!");
      $stop;
   end
end

always @(posedge rd_clk) begin
   if (rd_en && empty) begin
      $display($time, "%m error! afifo underflow!");
      $stop;
   end
end

// gray code monitor
reg [AW:0] last_gwr_ptr;
always @(posedge wr_clk or negedge wr_reset_n) begin
   if (!wr_reset_n) begin
      last_gwr_ptr <= #1 0;
   end
   else if (last_gwr_ptr !== grey_wr_ptr) begin
      check_ptr_chg(last_gwr_ptr, grey_wr_ptr);
      last_gwr_ptr <= #1 grey_wr_ptr;
   end 	
end

reg [AW:0] last_grd_ptr;
always @(posedge rd_clk or negedge rd_reset_n) begin
   if (!rd_reset_n) begin
     last_grd_ptr <= #1 0;
   end
   else if (last_grd_ptr !== grey_rd_ptr) begin
      check_ptr_chg(last_grd_ptr, grey_rd_ptr);
      last_grd_ptr <= #1 grey_rd_ptr;
   end 	
end

task check_ptr_chg;
input [AW:0] last_ptr;
input [AW:0] cur_ptr;
integer i;
integer ptr_diff;
begin
   ptr_diff = 0;
   for (i=0; i<= AW; i=i+ 1'b1) begin
      if (last_ptr[i] != cur_ptr[i]) begin
         ptr_diff = ptr_diff + 1'b1;
      end
   end
   if (ptr_diff !== 1) begin
      $display($time, "%m, ERROR! async fifo ptr has changed more than noe bit, last=%h, cur=%h",
				last_ptr, cur_ptr);
      $stop;
   end
end
endtask 	
   // synopsys translate_on

endmodule

//----------------------------------------------------------------------------
// Simple Double sync logic with Reset value = 1
// This double signal should be used for signal transiting from low to high
//----------------------------------------------------------------------------

module double_sync_low   (
              in_data    ,
              out_clk    ,
              out_rst_n  ,
              out_data   
          );

parameter WIDTH = 1;

input [WIDTH-1:0]    in_data    ; // Input from Different clock domain
input                out_clk    ; // Output clock
input                out_rst_n  ; // Active low Reset
output[WIDTH-1:0]    out_data   ; // Output Data


reg [WIDTH-1:0]     in_data_s  ; // One   Cycle sync 
reg [WIDTH-1:0]     in_data_2s ; // two   Cycle sync 
reg [WIDTH-1:0]     in_data_3s ; // three Cycle sync 

assign out_data =  in_data_3s;

always @(negedge out_rst_n or posedge out_clk)
begin
   if(out_rst_n == 1'b0)
   begin
      in_data_s  <= {WIDTH{1'b1}};
      in_data_2s <= {WIDTH{1'b1}};
      in_data_3s <= {WIDTH{1'b1}};
   end
   else
   begin
      in_data_s  <= in_data;
      in_data_2s <= in_data_s;
      in_data_3s <= in_data_2s;
   end
end


endmodule



/*********************************************************************
** module: bit register
** description: infers a register, make it modular
 ***********************************************************************/
module bit_register (
		 //inputs
		 we,		 
		 clk,
		 reset_n,
		 data_in,
		 
		 //outputs
		 data_out
		 );

//---------------------------------
// Reset Default value
//---------------------------------
parameter  RESET_DEFAULT = 1'h0;

  input	 we;
  input	 clk;
  input	 reset_n;
  input	 data_in;
  output data_out;
  
  reg	 data_out;
  
  //infer the register
  always @(posedge clk or negedge reset_n)
    begin
      if (!reset_n)
	data_out <= RESET_DEFAULT;
      else if (we)
	data_out <= data_in;
    end // always @ (posedge clk or negedge reset_n)
endmodule // register
