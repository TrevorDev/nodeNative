import Command from "nifty-cmd"
import readFile = require("fs-readfile-promise")
import fsp = require("fs-promise")
var path = require('path');

var getTime = async(file)=>{
	try{
		var stats = await fsp.stat(path.join(__dirname,file))
		return stats.mtime.getTime()
	}catch(e){
		return -1;
	}
}

var build = async(obj, time?)=>{
	var needBuild = false;

	//get the last modified time of the file being built to compare against dependencies
	if(!time){
		time = await getTime(obj.name)
		needBuild = true
	}

	if(obj.cmd){
		//build all dependencies if needed, build this if any dependencies needed to be built
		for(var i = 0;i<obj.dep.length;i++){
			var thisFileTime = await getTime(obj.dep[i])
			var built = await build(obj.dep[i], thisFileTime)
			needBuild = needBuild || built
		}

		//build this if this file doesnt exit
		var modTime = await getTime(obj.name)
		if(modTime == -1){
			needBuild = true
		}

		//Debug
		//console.log(obj.name+":  "+modTime+" "+time+" "+(modTime > time))

		//build if dependents are newer than target
		needBuild = needBuild || (modTime > time)
		if(needBuild){
			//build and print output
			console.log("Building: "+obj.name+":  "+obj.cmd)
			var command = new Command(obj.cmd);
			var result:any = await command.run()
			console.log(result.stdout)
			console.log(result.stderr)
			return true
		}else{
			return false
		}
	}else{
		//object files rely on cpp and header files
		var match = obj.match(/(.*)\.o$/)
		if(match){
			var o = match[1]+".o"
			var cpp = match[1]+".cpp"
			var h = match[1]+".h"
			return await build({
				name: o,
				dep: [cpp, h],
				cmd: "g++ -Wall -Wextra -Werror -o "+o +" -c "+cpp
			}, time)
		}

		//cpp and header files rely on lzz files, these are intermidiate files so I just build lzz file here
		match = obj.match(/(.*)\.cpp$/)
		match = match ? match : obj.match(/(.*)\.h/)
		if(match){
			var lzz = match[1]+".lzz"
			var dep = await getLzzDep(lzz)
			return await build({
				name: lzz,
				dep:dep,
				cmd: "lzz "+lzz
			}, time)
		}
	}
}

//gets the header files that the lzz file depends on
var getLzzDep = async(lzzFile)=>{ 
	var res = await readFile(lzzFile)
	var lines = res.toString().split("\n")
	var dep = lines.map((l)=>{
		var match = l.match(/#include \"(.*)\"/)
		if(match){
			return match[1]
		}else{
			return ""
		}
	}).filter((s)=>{return s != ""})
	return dep
}

var main = async()=>{
	var make = {
		main: {
			name: "main.exe",
			dep: ["main.o", "src/test.o"],
			cmd: "g++ -o main main.o src/test.o"
		}
	}
	await build(make.main)
}
main()