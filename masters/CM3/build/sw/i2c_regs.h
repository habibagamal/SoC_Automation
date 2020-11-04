#include "base_addr.h"

#define     I2C_PRE_LO_REG      0x0
#define     I2C_PRE_HI_REG      0x4
#define     I2C_CTRL_REG        0x8
#define     I2C_TX_REG          0xC
#define     I2C_RX_REG          0x10
#define     I2C_CMD_REG         0x14
#define     I2C_STAT_REG        0x18

#define     I2C_CMD_STA         0x80
#define     I2C_CMD_STO         0x40
#define     I2C_CMD_RD          0x20
#define     I2C_CMD_WR          0x10
#define     I2C_CMD_ACK         0x08
#define     I2C_CMD_IACK        0x01

#define     I2C_CTRL_EN         0x80
#define     I2C_CTRL_IEN        0x40

#define     I2C_STAT_RXACK      0x80
#define     I2C_STAT_BUSY       0x40
#define     I2C_STAT_AL         0x20
#define     I2C_STAT_TIP        0x02
#define     I2C_STAT_IF         0x01

unsigned int volatile * const I2C_PRE_LO = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_PRE_LO_REG);
unsigned int volatile * const I2C_PRE_HI = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_PRE_HI_REG);
unsigned int volatile * const I2C_CTRL = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_CTRL_REG);
unsigned int volatile * const I2C_TX = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_TX_REG);
unsigned int volatile * const I2C_RX = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_RX_REG);
unsigned int volatile * const I2C_CMD = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_CMD_REG);
unsigned int volatile * const I2C_STAT = (unsigned int *) (APB_APB2I2C_BASE_ADDR + I2C_STAT_REG);