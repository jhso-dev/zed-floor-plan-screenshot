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

async function createPhoto(filename) {
  const rl = new readlines(filename)

  try {
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
    const danjiId = row[1]
    const roomTypeId = row[2]
    const sh3d = `${danjiId}_${roomTypeId}.sh3d`
    const fullPathSh3d = path.resolve(__dirname, `sh3d/${sh3d}`)
    const fullPathOutput = path.resolve(__dirname, `output`)
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
        java -jar photo-creator-all.jar \
        -o ${fullPathOutput} \
        --transparent \
        --disable-exclude-furnitures \
        ${fullPathSh3d}`

      execSync(createPhotoCmd)
      console.timeEnd(`create image with ${sh3d}`)

      execSync(
        `aws s3 cp ./output/${danjiId}_${roomTypeId}.png s3://zigbang-zed/floor_plan/`
      )
      execSync(`echo "${sh3d}" >> success.txt`)
    } catch (e) {
      console.error(sh3d, e)
      execSync(`echo "${sh3d} ${e}" >> error.txt`)
    } finally {
      fs.unlink(fullPathSh3d, (err) => {
        console.log(`remove ${fullPathSh3d}`)
      })

      fs.unlink(
        `${fullPathOutput}/${danjiId}_${roomTypeId}_white.png`,
        (err) => {
          console.log(`remove ${danjiId}_${roomTypeId}_white.png`)
        }
      )
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
