main : src/test.o main.o
		g++ -o main main.o src/test.o

# main.o : src/test.h main.cpp main.h
# 		g++ -Wall -Wextra -Werror -c main.cpp -o main.o

%.o : $@.cpp
		g++ -c -Wall -Wextra -Werror $<

%.cpp %.h : %.lzz
	lzz $<

clean :
	rm -rf src/*.h src/*.o src/*.cpp *.h *.o *.cpp main.exe

.PRECIOUS: %.cpp %.o