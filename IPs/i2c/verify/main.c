#include "./sw/i2c_drv.c"

void I2C_test();

int main(){

	I2C_test();
  	return 0;
}

// passed
void I2C_test(){
	i2c_init(5);
	i2c_send(6, 69);
	// GPIO_TEST(0xffff, 0xabcd);
}