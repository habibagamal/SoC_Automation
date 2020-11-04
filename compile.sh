master="N5"
dir="N5/Demo"
dir_output="N5_Demo"
soc="demo"
subsystem="apb"
dump="real_dump"

# # subsystem + real master
node ./src/sys_gen.js -soc ./systems/$dir/$soc.json -subsystem ./systems/$dir/$subsystem.json -IPlib ./IPs/IPs.json -mastersLib ./masters/masters.json -outDir ./$dir_output/

echo "****************************"
echo "System Generated"
echo "****************************"

cd $dir_output
mv ./base_addr.h ../masters/$master/build/sw/base_addr.h

case "$master" in
    #case 1
    "CM0") echo "Master is CM0"
    cd ../masters/$master/build
    make clean
    make ;;
    #case 2
    "CM3") echo "Master is CM3"
    cd ../masters/$master/build
    make clean
    make ;;
    #case 3
    "N5") echo "Master is N5"
    cd ../masters/N5/build 
    sh build.sh main.c;;
esac

mv ./main.hex ../../main.hex
cd ..
cd ..
cd ..
echo "****************************"
echo "Hex Generated"
echo "****************************"

cd $dir_output
mv ../masters/main.hex ./main.hex

find . -name "*.v" > file.lst
iverilog -o ./$dump.vvp -c file.lst
vvp ./$dump.vvp 
open -a scansion.app ./$dump.vcd

echo "****************************"
echo "Script done"
echo "****************************"
