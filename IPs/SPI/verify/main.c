
#include "./sw/spi_drv.c"
#include "./sw/23lc512_drv.c"

void SPI_test();

int main(){

	SPI_test();
  	return 0;
}

// passed
void SPI_test(){
	int data;
  	spi_configure(0,0,20);
  	// some dummy delay
  	for(int i=0;i<25;i++);
 	write_byte(21, 55);
  	data = read_byte(21);
  	// if(data == 55) 
	//   	GPIO_TEST(0xffff, 0xabcd);
	// else 
	// 	GPIO_TEST(0xffff, 0xdcba);
}
