const fs = require("fs")
const path = require("path")
const { execSync, exec } = require("child_process")

const directoryPath = "./output" // 검색하려는 폴더 경로를 지정하세요

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error("폴더를 읽을 수 없습니다:", err)
    return
  }

  const pngFilesWithWhite = files.filter((file) => {
    return (
      file.toLowerCase().includes("white") &&
      path.extname(file).toLowerCase() === ".png"
    )
  })

  console.log("white를 포함한 PNG 파일 리스트:")
  pngFilesWithWhite.forEach((file) => {
    const index = file.indexOf("_white")
    if (index !== -1) {
      const cleanedFileName = file.slice(0, index) + file.slice(index + 6)
      try {
        execSync(
          `aws s3 cp ./output/${cleanedFileName} s3://zigbang-zed/floor_plan/`
        )
        console.log(cleanedFileName)
        execSync(`echo "${cleanedFileName}" >> success.txt`)
      } catch (e) {
        console.error(cleanedFileName, e)
        execSync(`echo "${cleanedFileName} ${e}" >> error.txt`)
      }
    }
  })
})
