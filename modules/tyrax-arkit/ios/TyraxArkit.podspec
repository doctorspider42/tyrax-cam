Pod::Spec.new do |s|
  s.name           = 'TyraxArkit'
  s.version        = '1.0.0'
  s.summary        = 'ARKit world-tracking pose stream for TyraX Cam'
  s.description    = 'Exposes the 6DoF pose of ARKit world tracking to JavaScript.'
  s.author         = ''
  s.homepage       = 'https://github.com/doctorspider42/tyrax-cam'
  # Matches Expo SDK 52's minimum; a lower target here disagrees with the
  # generated Podfile and CocoaPods warns on every install.
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'ARKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
