#include "base_addr.h"
#include "macros.h"

#define     SPI_DATA_REG        0x00000000
#define     SPI_CTRL_REG        0x00000004
#define     SPI_CFG_REG         0x00000008
#define     SPI_STATUS_REG      0x00000010

// CTRL register fields
#define     SPI_GO_BIT          0x0
#define     SPI_GO_SIZE         0x1
#define     SPI_SS_BIT          0x1
#define     SPI_SS_SIZE         0x1


// CFG register fields
#define     SPI_CPOL_BIT        0x0
#define     SPI_CPOL_SIZE       0x1
#define     SPI_CPHA_BIT        0x1
#define     SPI_CPHA_SIZE       0x1
#define     SPI_CLKDIV_BIT      0x2
#define     SPI_CLKDIV_SIZE     0x8

// status register fields
#define     SPI_DONE_BIT        0x0
#define     SPI_DONE_SIZE       0x1

#if APB_SPI_BASE_ADDR_0 != INVALID_ADDR
    #define SPI_BASE_ADDR APB_SPI_BASE_ADDR_0
#else
    #define SPI_BASE_ADDR AHB_SPI_BASE_ADDR_0
#endif

unsigned int volatile * const SPI_CTRL = (unsigned int *) (SPI_BASE_ADDR + SPI_CTRL_REG);
unsigned int volatile * const SPI_DATA = (unsigned int *) (SPI_BASE_ADDR + SPI_DATA_REG);
unsigned int volatile * const SPI_STATUS = (unsigned int *) (SPI_BASE_ADDR + SPI_STATUS_REG);
unsigned int volatile * const SPI_CFG = (unsigned int *) (SPI_BASE_ADDR + SPI_CFG_REG);
//unsigned int volatile * const SPI_PRESCALE = (unsigned int *) (SPI_BASE_ADDR + SPI_PRESCALE_REG);