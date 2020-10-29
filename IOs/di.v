module di(in, en, PU, PD, PAD);
    output in;
    
    input PU;
    input PD;
    input en;

    input PAD;

    assign in = PAD;
endmodule