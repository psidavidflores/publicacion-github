# Publicar en GitHub

## Arquitectura de publicación

La página se publica desde `docs/` mediante GitHub Pages. Los materiales se distribuyen como assets de un release del mismo repositorio. `docs/site-config.js` debe contener la URL base:

```js
releaseBaseUrl: "https://github.com/USUARIO/REPOSITORIO/releases/latest/download"
```

La página espera 499 assets en el release inicial:

- 479 archivos individuales.
- 4 paquetes por sección.
- 16 paquetes por instrumento.

Los nombres exactos están en `trabajo/release-manifest.json` y en los campos `assetName` de los catálogos.

## Comprobaciones previas

1. Verificar que `resources.json` y `test-groups.json` cargan.
2. Generar los assets a partir de `recursos-originales/` sin cambiar los originales.
3. Crear el release y subir los assets en lotes menores de 2 GB por operación.
4. Configurar GitHub Pages para publicar desde la carpeta `docs`.
5. Actualizar `releaseBaseUrl` y probar una descarga individual, una sección y un instrumento.
6. Probar la página desde la URL pública, no solamente desde la laptop.

## Nota de distribución

Los archivos grandes no deben enviarse como archivos Git normales. GitHub Pages no sirve archivos administrados por Git LFS; por eso los materiales se preparan como assets de release y la interfaz los enlaza directamente.
