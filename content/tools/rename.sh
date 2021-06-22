#!/bin/bash

NEWFILE=1

getNewFileName() {
    NEWFILEName=$(echo "$(($1 + 1))" )
}

for file in `ls|sort -g -r`
do
    filename=$(basename "$file")
    extension=${filename##*.}
    filename=${filename%.*}
    if [ $filename -ge $NEWFILE ]
    then
        getNewFileName $filename $extension || {
         file=$(echo $file  |cut -c2)
         getNewFileName $file $extension
        }
        printf -v NEWFILEName "%02d" $NEWFILEName
        NEWFILEName="$NEWFILEName.$extension"
        mv "$filename.$extension" $NEWFILEName
    fi
done

mkdir 01.topics
cp chapter.md 01.topics/
mv 01.topics/chapter.md 01.topics/docs.md