import React, { useEffect, useRef } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  Texture,
  RenderTargetTexture,
  DefaultRenderingPipeline,
  TransformNode,
  NodeMaterial,
  SceneLoader,
  InputBlock,
  Color3,
  ReflectionProbe,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import {
  AdvancedDynamicTexture,
  StackPanel,
  TextBlock,
  ColorPicker,
  Control,
} from "@babylonjs/gui";
import { ShadowOnlyMaterial } from "@babylonjs/materials";
import "../shaders/shaders";

const BabylonComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);

    // 创建主摄像机
    const camera = new ArcRotateCamera(
      "arcCamera",
      7.199,
      1.574,
      6.4,
      new Vector3(0, 1, 0),
      scene
    );
    camera.upperBetaLimit = 1.63;
    camera.lowerBetaLimit = 0;
    camera.upperRadiusLimit = 8.3;
    camera.lowerRadiusLimit = 3.5;
    camera.fov = 0.9;
    camera.wheelPrecision = 32;
    camera.attachControl(canvasRef.current, true);
    camera.layerMask = 1;
    camera.pinchPrecision = 0;

    // 创建UI摄像机
    const uiCamera = new ArcRotateCamera(
      "uiCamera",
      0,
      0,
      0,
      new Vector3(0, 1, 0),
      scene
    );
    uiCamera.layerMask = 2;

    scene.activeCameras = [camera, uiCamera];

    scene.clearColor = new Color4(0, 0, 0, 1);

    // 添加光源
    const light1 = new HemisphericLight("light1", new Vector3(0, 3, 0), scene);
    light1.intensity = 3;

    const light2 = new HemisphericLight("light2", new Vector3(0, 15, 0), scene);
    light2.intensity = 5;

    // 创建反射探针
    const reflectionProbe = new ReflectionProbe("reflectionProbe", 512, scene);
    reflectionProbe.position = new Vector3(0, 5, 0); // 设置位置

    // UI层设置
    const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    ui.layer.layerMask = 2;

    // Diamond Color Panel
    const diamondColorPanel = new StackPanel();
    diamondColorPanel.width = "200px";
    diamondColorPanel.isVertical = true;
    diamondColorPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    diamondColorPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(diamondColorPanel);

    const diamondColorText = new TextBlock();
    diamondColorText.text = "Diamond Color";
    diamondColorText.color = "White";
    diamondColorText.height = "30px";
    diamondColorPanel.addControl(diamondColorText);

    const diamondColorPicker = new ColorPicker();
    diamondColorPicker.value = Color3.FromHexString("#ef7c50");
    diamondColorPicker.height = "150px";
    diamondColorPicker.width = "150px";
    diamondColorPicker.horizontalAlignment =
      Control.HORIZONTAL_ALIGNMENT_CENTER;
    diamondColorPanel.addControl(diamondColorPicker);

    // Environment Color Panel
    const envColorPanel = new StackPanel();
    envColorPanel.width = "200px";
    envColorPanel.isVertical = true;
    envColorPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    envColorPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    envColorPanel.paddingTop = "500px";
    ui.addControl(envColorPanel);

    const envColorText = new TextBlock();
    envColorText.text = "Environment Color";
    envColorText.color = "White";
    envColorText.height = "30px";
    envColorPanel.addControl(envColorText);

    const envColorPicker = new ColorPicker();
    envColorPicker.value = Color3.FromHexString("#000001");
    envColorPicker.height = "150px";
    envColorPicker.width = "150px";
    envColorPicker.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    envColorPanel.addControl(envColorPicker);

    // 创建资源根节点
    const sceneRoot = new TransformNode("DiamondSceneRoot", scene);

    // 异步加载资源的函数
    const loadAssetsAsync = async () => {
      // 加载 diamond.json 场景
      const result = await SceneLoader.ImportMeshAsync(
        "",
        "/model/",
        "diamond.json",
        scene
      );

      result.meshes.forEach((mesh) => {
        mesh.parent = sceneRoot;
        mesh.layerMask = 1;
      });

      const diamond = scene.getMeshByID("diamond");
      const cloth = scene.getMeshByID("Cloth");
      const environment = scene.getMeshByID("environment");
      const shadow = scene.getMeshByID("shadow");

      // 设置环境材质的 metallicF0Factor
      const envMaterial = scene.getMaterialByID("envMaterial") as PBRMaterial;
      if (envMaterial) {
        envMaterial.metallicF0Factor = 0;
      }

      // 创建一个不可见的球体，用于折射
      const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
      sphere.position = diamond?.position.clone() || new Vector3(0, 0, 0);
      sphere.visibility = 1e-5;

      reflectionProbe.renderList.push(sphere);

      const sphereMaterial = new PBRMaterial("sphereMaterial", scene);
      sphere.material = sphereMaterial;

      // 创建折射渲染目标
      const refractionTexture = new RenderTargetTexture(
        "refraction",
        512,
        scene,
        true
      );
      refractionTexture.renderList = [cloth, environment, sphere];
      refractionTexture.lodGenerationScale = 0.5;
      scene.customRenderTargets.push(refractionTexture);

      sphereMaterial.refractionTexture = refractionTexture;
      sphereMaterial.linkRefractionWithTransparency = true;
      sphereMaterial.indexOfRefraction = 1.3;
      sphereMaterial.alpha = 0;
      sphereMaterial.roughness = 0.05;
      sphereMaterial.metallic = 0;

      // 设置 shadow 材质
      if (shadow) {
        const shadowMaterial = new ShadowOnlyMaterial("shadowMaterial", scene);
        shadowMaterial.opacityTexture = new Texture(
          "/shadow.png",
          scene,
          true,
          true
        );
        shadowMaterial.diffuseColor = new Color3(0, 0, 0);
        shadowMaterial.specularColor = new Color3(0, 0, 0);
        shadow.material = shadowMaterial;
      }

      // 加载并设置 diamondInner 材质
      try {
        const diamondInnerMaterial = await NodeMaterial.ParseFromFileAsync(
          "diamondMaterialInner",
          "/model/diamondInner.json",
          scene
        );
        const diamondInner = scene.getMeshByID("diamondInner");
        if (diamondInner) {
          diamondInnerMaterial.needDepthPrePass = true;
          diamondInner.material = diamondInnerMaterial;
          diamondInner.alphaIndex = 1.6;
          diamondInner.parent = diamond;

          // 设置材质属性
          const diamondColorBlock = diamondInnerMaterial.getBlockByName(
            "DiamondColor"
          ) as InputBlock;
          if (diamondColorBlock && diamondColorBlock.isInput) {
            diamondColorBlock.value = diamondColorPicker.value.clone();
          }

          const refractionBlock = diamondInnerMaterial.getBlockByName(
            "RefractionBlock"
          ) as InputBlock;
          if (refractionBlock && refractionBlock.isInput) {
            refractionBlock.texture = refractionTexture;
          }

          // 绑定颜色选择器事件
          diamondColorPicker.onValueChangedObservable.add((color) => {
            if (diamondColorBlock && diamondColorBlock.isInput) {
              diamondColorBlock.value = color.clone();
            }
          });
        }
      } catch (error) {
        console.error("Failed to load diamondInner.json:", error);
      }

      // 加载并设置 diamondOuter 材质
      try {
        const diamondOuterMaterial = await NodeMaterial.ParseFromFileAsync(
          "diamondMaterialOuter",
          "/model/diamondOuter.json",
          scene
        );
        const diamondOuter = scene.getMeshByID("diamondOuter");
        if (diamondOuter) {
          diamondOuterMaterial.needDepthPrePass = true;
          diamondOuter.material = diamondOuterMaterial;
          diamondOuter.parent = diamond;

          // 设置材质属性
          const diamondColorBlock = diamondOuterMaterial.getBlockByName(
            "DiamondColor"
          ) as InputBlock;
          if (diamondColorBlock && diamondColorBlock.isInput) {
            diamondColorBlock.value = diamondColorPicker.value.clone();
          }

          const refractionBlock =
            diamondOuterMaterial.getBlockByName("RefractionBlock");
          if (refractionBlock && refractionBlock.isInput) {
            refractionBlock.texture = refractionTexture;
          }

          // 绑定颜色选择器事件
          diamondColorPicker.onValueChangedObservable.add((color) => {
            if (diamondColorBlock && diamondColorBlock.isInput) {
              diamondColorBlock.value = color.clone();
            }
          });
        }
      } catch (error) {
        console.error("Failed to load diamondOuter.json:", error);
      }

      // 加载并设置 Cloth 材质
      try {
        const clothMaterial = await NodeMaterial.ParseFromFileAsync(
          "redCloth",
          "/model/redCloth.json",
          scene
        );
        if (cloth) {
          clothMaterial.needDepthPrePass = true;
          clothMaterial.backFaceCulling = false;
          cloth.material = clothMaterial;

          // 设置初始颜色
          const baseColorBlock = clothMaterial.getBlockByName(
            "baseColor"
          ) as InputBlock;
          if (baseColorBlock && baseColorBlock.isInput) {
            baseColorBlock.value = envColorPicker.value.clone();
          }

          // 设置 specularIntensity
          const pbrBlock = clothMaterial.getBlockByName("PBRMetallicRoughness");
          if (
            pbrBlock &&
            "specularIntensity" in pbrBlock &&
            typeof pbrBlock["specularIntensity"] === "number"
          ) {
            pbrBlock["specularIntensity"] = 0;
          }

          // 绑定颜色选择器事件
          envColorPicker.onValueChangedObservable.add((color) => {
            if (baseColorBlock && baseColorBlock.isInput) {
              baseColorBlock.value = color.clone();
            }
            if (environment && environment.material) {
              (environment.material as PBRMaterial).albedoColor = color;
            }
          });
        }
      } catch (error) {
        console.error("Failed to load redCloth.json:", error);
      }

      // 设置环境的材质颜色
      if (environment && environment.material) {
        (environment.material as PBRMaterial).albedoColor =
          envColorPicker.value.clone();
      }

      // 添加后期处理效果
      const pipeline = new DefaultRenderingPipeline("diamondPP", true, scene, [
        camera,
      ]);
      pipeline.samples = 8;
      pipeline.chromaticAberrationEnabled = true;
      pipeline.chromaticAberration.aberrationAmount = 20;
      pipeline.chromaticAberration.radialIntensity = 0.7;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0;
      pipeline.bloomWeight = 2;
      pipeline.bloomKernel = 3;
      pipeline.bloomScale = 1;
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 2;
      pipeline.imageProcessing.vignetteCameraFov = 1.25;

      // 渲染循环中旋转摄像机
      scene.onBeforeRenderObservable.add(() => {
        camera.alpha += 0.001;
      });
    };

    // 调用异步加载函数
    loadAssetsAsync();

    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });

    return () => {
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export default BabylonComponent;
