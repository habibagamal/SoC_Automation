module dio (in, out, en, PU, PD, PAD);
    output in;
    input en;
    input PU;
    input PD;
    
    input out;

    inout PAD;
    
    assign PAD = en ? out: 1'bz;
    assign in = PAD;

endmodule