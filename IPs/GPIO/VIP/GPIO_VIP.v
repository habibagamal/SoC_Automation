`define GPIO_DATA 16'h9
module GPIO_VIP(
    input [15: 0] GPIOOUT
);
    always @ (GPIOOUT) begin
        if (GPIOOUT == 16'h9) begin
            $display("GPIO Test Passed");
			$finish();
        end
    end

endmodule