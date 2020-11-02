#include "i2c_regs.h"

void i2c_init(unsigned int pre){
    //unsigned int sysCLK, unsigned int i2cCLK)
    //unsigned int pre = sysCLK/i2cCLK/5;
    *(I2C_PRE_LO) = pre & 0xff;
    *(I2C_PRE_HI) = pre & 0xff00;
    *(I2C_CTRL) = I2C_CTRL_EN | I2C_CTRL_IEN;
}

int i2c_send(unsigned char saddr, unsigned char sdata){
    //int volatile y;
    *(I2C_TX) = saddr;
    *(I2C_CMD) = I2C_CMD_STA | I2C_CMD_WR;
    while( ((*I2C_STAT) & I2C_STAT_TIP) != 0 );
    //(*I2C_STAT) & I2C_STAT_TIP ;

    if( ((*I2C_STAT) & I2C_STAT_RXACK)) {
        *(I2C_CMD) = I2C_CMD_STO;
        return 0;
    }
    *(I2C_TX) = sdata;
    *(I2C_CMD) = I2C_CMD_WR;
    while( (*I2C_STAT) & I2C_STAT_TIP );
    *(I2C_CMD) = I2C_CMD_STO;
    if( ((*I2C_STAT) & I2C_STAT_RXACK ))
        return 0;
    else
        return 1;
}

// void i2c_send(unsigned char daddr, unsigned char saddr, unsigned char sdata){
//     int volatile y;
//     *(I2C_TX) = daddr;
//     *(I2C_CMD) = I2C_CMD_STA | I2C_CMD_WR;
//     while( ((*I2C_STAT) & I2C_STAT_TIP) != 0 );
//     //(*I2C_STAT) & I2C_STAT_TIP ;

//     if( ((*I2C_STAT) & I2C_STAT_RXACK)  ) {
//         *(I2C_CMD) = I2C_CMD_STO;
//         return 0;
//     }

    
//     *(I2C_TX) = saddr;
//     *(I2C_CMD) = I2C_CMD_WR;
//     while( (*I2C_STAT) & I2C_STAT_TIP );
    
//     if( ((*I2C_STAT) & I2C_STAT_RXACK)  ) {
//         *(I2C_CMD) = I2C_CMD_STO;
//         return 0;
//     }

//     *(I2C_TX) = sdata;
//     *(I2C_CMD) = I2C_CMD_WR;
//     while( (*I2C_STAT) & I2C_STAT_TIP );
//     *(I2C_CMD) = I2C_CMD_STO;
//     if( ((*I2C_STAT) & I2C_STAT_RXACK ) )
//         return 0;
//     else
//         return 1;
// }
