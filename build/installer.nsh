!macro customInstall
  CreateDirectory "$SMPROGRAMS\TeX Suite"
  CreateShortCut "$SMPROGRAMS\TeX Suite\texManuscript.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--manuscript"
  CreateShortCut "$SMPROGRAMS\TeX Suite\texBeamer.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--beamer"
!macroend
!macro customUnInstall
  Delete "$SMPROGRAMS\TeX Suite\texManuscript.lnk"
  Delete "$SMPROGRAMS\TeX Suite\texBeamer.lnk"
  RMDir "$SMPROGRAMS\TeX Suite"
!macroend
