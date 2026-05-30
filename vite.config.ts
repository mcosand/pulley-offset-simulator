import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [    react({
      // Enable JSX Decorators
      // NOTE: we need this for MobX
      useAtYourOwnRisk_mutateSwcOptions(options) {
        options.jsc!.parser!.decorators = true;
        options.jsc!.transform!.decoratorVersion = '2022-03';
      },

      // Force SWC transforms to run during `vite build` as well
      plugins: [],
    }), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  }
})
