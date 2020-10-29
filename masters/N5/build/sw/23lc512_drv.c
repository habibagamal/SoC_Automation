#include "23lc512_drv.h"

void write_byte(unsigned int addr, unsigned int data){
  spi_start_transaction();
  spi_write(0x2);
  spi_write(addr >> 8);     // Address high byte
  spi_write(addr & 0xFF);   // Address low byte
  spi_write(data);
  spi_finish_transaction();
}

unsigned char read_byte(unsigned short addr){
  spi_start_transaction();
  spi_write(0x3);
  spi_write(addr >> 8);     // Address high byte
  spi_write(addr & 0xFF);   // Address low byte
  spi_write(0);             // just write a dummy data to get the data out
  spi_finish_transaction();
  return spi_read();
}