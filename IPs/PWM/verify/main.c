#include "./sw/pwm_drv.c"

void PWM_test();

int main(){

	PWM_test();
  	return 0;
}

// passed
void PWM_test(){
	pwm_disable();
	pwm_init(199, 49, 9);
	pwm_enable();
	for(int volatile i=0; i<500; i++);
	// GPIO_TEST(0xffff, 0xaaaa);
}