$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$map = @(
    @{ src = "3D biscuits.mp4";     slug = "3d-biscuits" }
    @{ src = "3D clock.mp4";        slug = "3d-clock" }
    @{ src = "3D glasses.mp4";      slug = "3d-glasses" }
    @{ src = "3D headphones.mp4";   slug = "3d-headphones" }
    @{ src = "3D Lipstick.mp4";     slug = "3d-lipstick" }
    @{ src = "3D nail polish.mp4";  slug = "3d-nail-polish" }
    @{ src = "3D Soft Drink.mp4";   slug = "3d-soft-drink" }
    @{ src = "Crossbody bag.mp4";   slug = "crossbody-bag" }
    @{ src = "Eva 3D.mp4";          slug = "eva-3d" }
    @{ src = "Travel bag.mp4";      slug = "travel-bag" }
)

foreach ($item in $map) {
    $srcPath = "./raw-videos/$($item.src)"
    $outVideo = "./assets/videos/$($item.slug).mp4"
    $outPoster = "./assets/images/posters/$($item.slug).jpg"

    Write-Host "`n=== Processing $($item.src) -> $($item.slug) ==="

    # Get orientation
    $dims = ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$srcPath"
    $w, $h = $dims -split ","
    $w = [int]$w; $h = [int]$h

    if ($w -ge $h) {
        $scaleFilter = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2"
    } else {
        $scaleFilter = "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2"
    }

    ffmpeg -y -i "$srcPath" `
        -vf "$scaleFilter" `
        -c:v libx264 -preset slow -crf 23 -maxrate 6800k -bufsize 13600k `
        -pix_fmt yuv420p -profile:v high -level 4.1 `
        -c:a aac -b:a 128k -ar 44100 `
        -movflags +faststart `
        "$outVideo" 2>&1 | Select-String -Pattern "error|Error"

    # Poster thumbnail at ~15% into the clip
    $duration = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 "$srcPath")
    $seekTime = [math]::Round($duration * 0.15, 2)

    ffmpeg -y -ss $seekTime -i "$srcPath" -vframes 1 -vf "$scaleFilter" -q:v 3 "$outPoster" 2>&1 | Select-String -Pattern "error|Error"

    $outSize = (Get-Item $outVideo).Length / 1MB
    Write-Host "Done: $([math]::Round($outSize,2)) MB"
}

Write-Host "`n=== ALL DONE ==="
Get-ChildItem "./assets/videos" | Select-Object Name, @{N="MB";E={[math]::Round($_.Length/1MB,2)}}
