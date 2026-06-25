import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 6 else {
  fail("Usage: swift export-teardown-frames.swift <source.mp4> <output-dir> <frame-count> <max-width> <jpeg-quality>")
}

let sourceURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2], isDirectory: true)
guard let frameCount = Int(args[3]), frameCount > 1 else {
  fail("frame-count must be greater than 1")
}
guard let maxWidth = Double(args[4]), maxWidth > 0 else {
  fail("max-width must be greater than 0")
}
guard let quality = Double(args[5]), quality > 0, quality <= 1 else {
  fail("jpeg-quality must be in 0...1")
}

let asset = AVURLAsset(url: sourceURL)
let duration = CMTimeGetSeconds(asset.duration)
guard duration.isFinite, duration > 0 else {
  fail("Could not read video duration")
}

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: maxWidth, height: maxWidth)
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.25, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.25, preferredTimescale: 600)

let digits = String(frameCount - 1).count
let usableStart = min(0.35, duration * 0.08)
let usableEnd = max(usableStart, duration - min(0.35, duration * 0.08))
var exported = 0

for index in 0..<frameCount {
  let progress = Double(index) / Double(frameCount - 1)
  let seconds = usableStart + (usableEnd - usableStart) * progress
  let time = CMTime(seconds: seconds, preferredTimescale: 600)
  let filename = "frame-\(String(format: "%0\(digits)d", index)).jpg"
  let destinationURL = outputURL.appendingPathComponent(filename)

  do {
    let image = try generator.copyCGImage(at: time, actualTime: nil)
    guard let destination = CGImageDestinationCreateWithURL(
      destinationURL as CFURL,
      UTType.jpeg.identifier as CFString,
      1,
      nil
    ) else {
      fail("Could not create image destination for \(filename)")
    }

    let options = [
      kCGImageDestinationLossyCompressionQuality as String: quality
    ] as CFDictionary
    CGImageDestinationAddImage(destination, image, options)
    guard CGImageDestinationFinalize(destination) else {
      fail("Could not write \(filename)")
    }
    exported += 1
  } catch {
    fail("Frame \(index) at \(String(format: "%.3f", seconds))s failed: \(error)")
  }
}

print("Exported \(exported) frames from \(String(format: "%.2f", duration))s video to \(outputURL.path)")
