export type EditorControlLayout = {
  isHorizontal: boolean;
  containerColumns: string;
  previewColumnFlex: string;
  widthColumnFlex: string;
};

export const getEditorControlLayout = (viewportWidth: number): EditorControlLayout => {
  if (viewportWidth < 390) {
    return {
      isHorizontal: false,
      containerColumns: '1fr',
      previewColumnFlex: '1 1 100%',
      widthColumnFlex: '1 1 100%',
    };
  }

  return {
    isHorizontal: true,
    containerColumns: 'minmax(0, 0.44fr) minmax(0, 0.56fr)',
    previewColumnFlex: '0 1 44%',
    widthColumnFlex: '0 1 56%',
  };
};
