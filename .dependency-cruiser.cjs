/** @type {import('dependency-cruiser').IConfiguration} */

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    includeOnly: "^src",
    reporterOptions: {
      dot: {
        collapsePattern: "^src/[^/]+",
        theme: {
          graph: {
            rankdir: "TB",
            splines: "ortho",
            nodesep: 1.0,
            ranksep: 2.0,
            fontname: "Helvetica",
          },
          node: {
            shape: "box",
            style: "filled,rounded",
            fillcolor: "#ddeeff",
            color: "#6699cc",
            fontname: "Helvetica",
            fontsize: 12,
          },
          edge: {
            penwidth: 1,
            arrowsize: 0.6,
            color: "#555555",
          },
          modules: [
            {
              criteria: { circular: true },
              attributes: {
                fillcolor: "#ffcccc",
                color: "#cc0000",
                penwidth: 2,
              },
            },
          ],
          dependencies: [
            {
              criteria: { circular: true },
              attributes: {
                color: "#cc0000",
                penwidth: 2,
                style: "dashed",
              },
            },
          ],
        },
      },
    },
  },
};
