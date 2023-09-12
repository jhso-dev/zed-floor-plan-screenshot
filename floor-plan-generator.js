const fs = require("fs")
const https = require("https")
const path = require("path")
const readlines = require("n-readlines")
const { execSync, exec } = require("child_process")

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest)
    }

    const file = fs.createWriteStream(dest, { flags: "wx" })

    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
      } else {
        file.close()
        fs.unlink(dest, () => {}) // Delete temp file
        reject(
          `Server responded with ${response.statusCode}: ${response.statusMessage}`
        )
      }
    })

    request.on("error", (err) => {
      file.close()
      fs.unlink(dest, () => {}) // Delete temp file
      reject(err.message)
    })

    file.on("finish", () => {
      resolve()
    })

    file.on("error", (err) => {
      file.close()

      if (err.code === "EEXIST") {
        reject("File already exists")
      } else {
        fs.unlink(dest, () => {}) // Delete temp file
        reject(err.message)
      }
    })
  })
}

function upload(tempFolder, destFile, sh3d) {
  return new Promise((resolve, reject) => {
    try {
      fs.readdir(tempFolder, (err, files) => {
        if (err) {
          console.error("Can't read folder:", err)
          reject(e)
          return
        }

        const pngFilesWithWhite = files.filter((file) => {
          return (
            !file.toLowerCase().includes("white") &&
            path.extname(file).toLowerCase() === ".png"
          )
        })

        if (!pngFilesWithWhite?.length) {
          reject("file is not exist")
          return
        }

        pngFilesWithWhite.forEach((file) => {
          try {
            execSync(`mv ${tempFolder}/${file} ${destFile}`)
            console.log(`mv ${tempFolder}/${file} ${destFile}`)
            execSync("sleep 0.5")
            console.log("sleep 0.5")
            execSync(`aws s3 cp ${destFile} s3://zigbang-zed/floor_plan_third/`)
            console.log(
              `aws s3 cp ${destFile} s3://zigbang-zed/floor_plan_third/`
            )
            execSync(`echo "${sh3d}" >> success.txt`)

            fs.rmSync(tempFolder, {
              recursive: true,
              force: true,
            })

            resolve()
          } catch (e) {
            console.error(e)
            execSync(`echo "${sh3d} ${e}" >> error.txt`)
            reject(e)
          }
        })
      })
    } catch (e) {
      console.error(e)
      reject(e)
    }
  })
}

async function createPhoto(filename) {
  const rl = new readlines(filename)

  try {
    exec("export DISPLAY=:99")
    exec("Xvfb :99 -screen 0 1024x768x24 &")
  } catch (e) {
    console.error(e)
  }

  let isFirstLine = true
  let line
  while ((line = rl.next())) {
    if (isFirstLine) {
      isFirstLine = false
      continue
    }
    const row = line.toString("utf-8").split(",")
    const danjiId = row[0]
    const roomTypeId = row[1]
    const danjiIdWithRoomTypeId = `${danjiId}_${roomTypeId}`
    const sh3d = `${danjiIdWithRoomTypeId}.sh3d`
    const fullPathSh3d = path.resolve(__dirname, `sh3d/${sh3d}`)
    const fullPathOutput = path.resolve(__dirname, `output`)
    const fullPathDanjiWithRoomTypeIdOutput = `${fullPathOutput}/${danjiIdWithRoomTypeId}`
    console.log(`>>> start with ${sh3d}`)

    try {
      console.time(`download ${sh3d}`)
      // await download(
      //   `https://d1uvym69u0pmlm.cloudfront.net/sweethome/${sh3d}`,
      //   fullPathSh3d
      // )

      execSync(`aws s3 cp s3://zigbang-zed/sweethome/${sh3d} ./sh3d/`)

      console.timeEnd(`download ${sh3d}`)

      console.time(`create image with ${sh3d}`)
      const createPhotoCmd = `
        java -jar photo-creator-all-3.jar \
        -o ${fullPathDanjiWithRoomTypeIdOutput} \
        --transparent \
        --disable-exclude-furnitures \
        ${fullPathSh3d}`

      execSync(createPhotoCmd)
      console.timeEnd(`create image with ${sh3d}`)

      execSync("sleep 1")

      console.log("start upload")
      console.time(`upload with ${sh3d}`)
      await upload(
        fullPathDanjiWithRoomTypeIdOutput,
        `${fullPathOutput}/${danjiIdWithRoomTypeId}.png`,
        sh3d
      )
    } catch (e) {
      console.error(sh3d, e)
      execSync(`echo "${sh3d} ${e}" >> error.txt`)
    } finally {
      fs.unlink(fullPathSh3d, (err) => {
        console.log(`remove ${fullPathSh3d}`)
      })
      console.timeEnd(`upload with ${sh3d}`)
    }
  }

  try {
    exec("killall Xvfb")
  } catch (e) {
    console.error(e)
  }
}

if (process.argv.length < 3) {
  console.log("사용법: node task.js [csv파일명]")
  process.exit(1)
}

const filename = process.argv[2]
createPhoto(filename)
