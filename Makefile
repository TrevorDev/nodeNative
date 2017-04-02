main :	build.js
		node build.js main

build.js:
	tsc

clean :
	rm -rf src/*.h src/*.o src/*.cpp *.h *.o *.cpp main.exe