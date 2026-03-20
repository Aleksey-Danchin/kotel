export const getRoot = () => {
  let root = document.getElementById("root");

  if (!root) {
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  }

  return root;
};
