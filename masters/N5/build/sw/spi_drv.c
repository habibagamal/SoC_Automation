#include "macros.h"
#include "spi_regs.h"
#include "spi_drv.h"

void spi_start_transaction(){
  SET_BIT(*SPI_CTRL, SPI_SS_BIT);
}

void spi_finish_transaction(){
  CLR_BIT(*SPI_CTRL, SPI_SS_BIT);
}

void spi_configure(unsigned char cpol, unsigned char cpha, unsigned char clkdiv){
  unsigned int cfg_value = 0;
  cfg_value |=  cpol;
  cfg_value |=  (cpha << 1);
  cfg_value |=  ((unsigned int)clkdiv << 2);
  *SPI_CFG = cfg_value;
}

unsigned char spi_read(){
  return *SPI_DATA;
}
void spi_write(unsigned char data){
    *SPI_DATA =  data;
    SET_BIT(*SPI_CTRL, SPI_GO_BIT);
    CLR_BIT(*SPI_CTRL, SPI_GO_BIT);
    while(!spi_status());
}

unsigned int spi_status(){
  return *SPI_STATUS & 1;
}